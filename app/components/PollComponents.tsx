"use client";

import { type ReactNode, useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { useNotification } from "@coinbase/onchainkit/minikit";
import { Button } from "./DemoComponents";
import { Icon } from "./DemoComponents";
import { type PollResult } from "../../lib/contract";
import { useCreatePoll, useVote, usePollContract } from "../../lib/hooks";

type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

function Card({
  title,
  children,
  className = "",
  onClick,
}: CardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`bg-[var(--app-card-bg)] backdrop-blur-md rounded-xl shadow-lg border border-[var(--app-card-border)] overflow-hidden transition-all hover:shadow-xl ${className} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
    >
      {title && (
        <div className="px-5 py-3 border-b border-[var(--app-card-border)]">
          <h3 className="text-lg font-medium text-[var(--app-foreground)]">
            {title}
          </h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

type CreatePollProps = {
  onPollCreated: () => void;
};

export function CreatePoll({ onPollCreated }: CreatePollProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [deadline, setDeadline] = useState(60); // 60 minutes default
  const [isCreating, setIsCreating] = useState(false);
  const { address } = useAccount();
  const sendNotification = useNotification();
  const { createPoll } = useCreatePoll();

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const isValid = question.trim() !== "" && 
    options.every(opt => opt.trim() !== "") && 
    options.length >= 2 &&
    deadline > 0;

  const handleCreatePoll = useCallback(async () => {
    if (!isValid || isCreating) return;
    
    setIsCreating(true);
    try {
      const result = await createPoll(question, options, deadline);
      
      await sendNotification({
        title: "Poll Created!",
        body: `Your poll has been created successfully. Hash: ${result.slice(0, 10)}...`,
      });
      
      // Clear form
      setQuestion("");
      setOptions(["", ""]);
      setDeadline(60);
      onPollCreated();
    } catch (error) {
      console.error("Error creating poll:", error);
      await sendNotification({
        title: "Error!",
        body: "An error occurred while creating the poll.",
      });
    } finally {
      setIsCreating(false);
    }
  }, [isValid, isCreating, createPoll, question, options, deadline, sendNotification, onPollCreated]);

  return (
    <Card title="Create New Poll">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--app-foreground)] mb-2">
            Question
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your poll question..."
            className="w-full px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--app-foreground)] mb-2">
            Options
          </label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="text-[var(--app-foreground-muted)] hover:text-red-500"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <Button
              variant="outline"
              size="sm"
              onClick={addOption}
              className="mt-2"
              icon={<Icon name="plus" size="sm" />}
            >
              Add Option
            </Button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--app-foreground)] mb-2">
            End Time (minutes)
          </label>
          <input
            type="number"
            value={deadline}
            onChange={(e) => setDeadline(Number(e.target.value))}
            min="1"
            max="1440"
            className="w-full px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
          />
        </div>

        <div className="flex flex-col items-center">
          {address ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreatePoll}
              disabled={!isValid || isCreating}
              className="w-full"
            >
              {isCreating ? "Creating..." : "Create Poll"}
            </Button>
          ) : (
            <p className="text-yellow-400 text-sm text-center mt-2">
              Connect your wallet to create a poll
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

type PollCardProps = {
  pollResult: PollResult;
  onVote: () => void;
};

export function PollCard({ pollResult, onVote }: PollCardProps) {
  const { pollId, poll, results, totalVotes, hasVoted, isActive } = pollResult;
  const { address } = useAccount();
  const sendNotification = useNotification();
  const { vote } = useVote();

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US');
  };

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const handleVote = useCallback(async (option: string) => {
    if (!address) return;

    try {
      await vote(pollId, option);
      
      await sendNotification({
        title: "Vote Cast!",
        body: `You voted for ${option}.`,
      });
      
      onVote();
    } catch (error) {
      console.error("Error voting:", error);
      await sendNotification({
        title: "Error!",
        body: "An error occurred while voting.",
      });
    }
  }, [address, vote, pollId, sendNotification, onVote]);

  return (
    <Card title={`Poll #${pollId}`} className="mb-4">
      <div className="space-y-4">
        <div>
          <h4 className="text-lg font-medium text-[var(--app-foreground)] mb-2">
            {poll.question}
          </h4>
          <div className="text-sm text-[var(--app-foreground-muted)]">
            <p>Start: {formatTime(poll.startTime)}</p>
            <p>End: {formatTime(poll.endTime)}</p>
            <p>Total Votes: {totalVotes}</p>
            <p className={`font-medium ${isActive ? 'text-green-500' : 'text-red-500'}`}>
              {isActive ? 'Active' : 'Ended'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {poll.options.map((option, index) => {
            const votes = results[index] || 0;
            const percentage = getPercentage(votes);
            const isWinning = votes === Math.max(...results);
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--app-foreground)] font-medium">
                    {option}
                  </span>
                  <span className="text-[var(--app-foreground-muted)] text-sm">
                    {votes} votes ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-[var(--app-gray)] rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isWinning ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-accent-light)]'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {isActive && !hasVoted && address && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVote(option)}
                    className="w-full"
                  >
                    Vote for This Option
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {hasVoted && (
          <div className="text-center p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <Icon name="check" className="text-green-500 mx-auto mb-1" />
            <span className="text-green-600 dark:text-green-400 text-sm">
              You have voted in this poll
            </span>
          </div>
        )}

        {!isActive && (
          <div className="text-center p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <span className="text-red-600 dark:text-red-400 text-sm">
              This poll has ended
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

type PollListProps = {
  polls: PollResult[];
  onRefresh: () => void;
};

export function PollList({ polls, onRefresh }: PollListProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-[var(--app-foreground)]">
          Current Polls ({polls.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          icon={<Icon name="refresh" size="sm" />}
        >
          Refresh
        </Button>
      </div>
      
      {polls.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Icon name="info" className="text-[var(--app-foreground-muted)] mx-auto mb-2" size="lg" />
            <p className="text-[var(--app-foreground-muted)]">
              No polls available yet. Create the first poll!
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {polls.map((pollResult) => (
            <PollCard
              key={pollResult.pollId}
              pollResult={pollResult}
              onVote={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type VoteByPollIdProps = {
  onVote: () => void;
};

export function VoteByPollId({ onVote }: VoteByPollIdProps) {
  const [pollId, setPollId] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [pollData, setPollData] = useState<PollResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const { address } = useAccount();
  const sendNotification = useNotification();
  const { vote } = useVote();
  const { fetchPoll } = usePollContract();

  const handleFetchPoll = useCallback(async () => {
    if (!pollId.trim()) return;
    
    setIsLoading(true);
    try {
      const poll = await fetchPoll(parseInt(pollId));
      if (poll) {
        setPollData(poll);
        setSelectedOption("");
      } else {
        setPollData(null);
        await sendNotification({
          title: "Poll Not Found",
          body: `Poll with ID ${pollId} does not exist.`,
        });
      }
    } catch (error) {
      console.error("Error fetching poll:", error);
      await sendNotification({
        title: "Error",
        body: "Failed to fetch poll data.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [pollId, fetchPoll, sendNotification]);

  const handleVote = useCallback(async () => {
    if (!address || !pollData || !selectedOption || isVoting) return;

    setIsVoting(true);
    try {
      await vote(pollData.pollId, selectedOption);
      
      await sendNotification({
        title: "Vote Cast!",
        body: `You voted for ${selectedOption} in poll #${pollData.pollId}.`,
      });
      
      onVote();
      setPollData(null);
      setPollId("");
      setSelectedOption("");
    } catch (error) {
      console.error("Error voting:", error);
      await sendNotification({
        title: "Error!",
        body: "An error occurred while voting.",
      });
    } finally {
      setIsVoting(false);
    }
  }, [address, pollData, selectedOption, vote, sendNotification, onVote, isVoting]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US');
  };

  const getPercentage = (votes: number, totalVotes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  return (
    <div className="space-y-6">
      <Card title="Vote by Poll ID">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--app-foreground)] mb-2">
              Poll ID
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={pollId}
                onChange={(e) => setPollId(e.target.value)}
                placeholder="Enter poll ID (e.g., 0, 1, 2...)"
                className="flex-1 px-3 py-2 border border-[var(--app-border)] rounded-lg bg-[var(--app-input-bg)] text-[var(--app-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
                min="0"
              />
              <Button
                onClick={handleFetchPoll}
                disabled={!pollId.trim() || isLoading}
                icon={isLoading ? <Icon name="refresh" size="sm" className="animate-spin" /> : undefined}
              >
                {isLoading ? "Loading..." : "Fetch Poll"}
              </Button>
            </div>
          </div>

          {pollData && (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--app-card-bg)] rounded-lg border border-[var(--app-border)]">
                <h4 className="text-lg font-medium text-[var(--app-foreground)] mb-2">
                  {pollData.poll.question}
                </h4>
                <div className="text-sm text-[var(--app-foreground-muted)] space-y-1">
                  <p>Poll ID: {pollData.pollId}</p>
                  <p>Start: {formatTime(pollData.poll.startTime)}</p>
                  <p>End: {formatTime(pollData.poll.endTime)}</p>
                  <p>Total Votes: {pollData.totalVotes}</p>
                  <p className={`font-medium ${pollData.isActive ? 'text-green-500' : 'text-red-500'}`}>
                    {pollData.isActive ? 'Active' : 'Ended'}
                  </p>
                  {pollData.hasVoted && (
                    <p className="text-blue-500 font-medium">You have already voted in this poll</p>
                  )}
                </div>
              </div>

              {pollData.isActive && !pollData.hasVoted && address && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-[var(--app-foreground)]">
                    Select an option to vote:
                  </label>
                  <div className="space-y-2">
                    {pollData.poll.options.map((option, index) => {
                      const votes = pollData.results[index] || 0;
                      const percentage = getPercentage(votes, pollData.totalVotes);
                      const isWinning = votes === Math.max(...pollData.results);
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="radio"
                                name="voteOption"
                                value={option}
                                checked={selectedOption === option}
                                onChange={(e) => setSelectedOption(e.target.value)}
                                className="text-[var(--app-accent)] focus:ring-[var(--app-accent)]"
                              />
                              <span className="text-[var(--app-foreground)] font-medium">
                                {option}
                              </span>
                            </label>
                            <span className="text-[var(--app-foreground-muted)] text-sm">
                              {votes} votes ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-[var(--app-gray)] rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                isWinning ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-accent-light)]'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <Button
                    onClick={handleVote}
                    disabled={!selectedOption || isVoting}
                    className="w-full"
                    icon={isVoting ? <Icon name="refresh" size="sm" className="animate-spin" /> : undefined}
                  >
                    {isVoting ? "Voting..." : "Cast Vote"}
                  </Button>
                </div>
              )}

              {pollData.hasVoted && (
                <div className="text-center p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Icon name="check" className="text-green-500 mx-auto mb-1" />
                  <span className="text-green-600 dark:text-green-400 text-sm">
                    You have already voted in this poll
                  </span>
                </div>
              )}

              {!pollData.isActive && (
                <div className="text-center p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <span className="text-red-600 dark:text-red-400 text-sm">
                    This poll has ended
                  </span>
                </div>
              )}

              {!address && (
                <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <span className="text-yellow-600 dark:text-yellow-400 text-sm">
                    Connect your wallet to vote
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
