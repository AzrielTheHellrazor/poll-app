import { useCallback, useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI, type Poll, type PollResult } from "./contract";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

export function usePollContract() {
  const { address } = useAccount();
  
  // Public client for reading contract data
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });
  
  // Get current poll count
  const { data: pollCount = 0 } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "pollId",
  });

  // State for polls
  const [polls, setPolls] = useState<PollResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPolls = useCallback(async () => {
    if (!pollCount) {
      setPolls([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const pollResults: PollResult[] = [];
      
      // Get real contract data
      for (let i = 0; i < Number(pollCount); i++) {
        const poll = await fetchPoll(i);
        if (poll) {
          pollResults.push(poll);
        }
      }
      
      setPolls(pollResults.reverse()); // Newest polls first
    } catch (error) {
      console.error("Error loading polls:", error);
    } finally {
      setLoading(false);
    }
  }, [pollCount]);

  const fetchPoll = useCallback(async (pollId: number): Promise<PollResult | null> => {
    try {
      // Get poll data
      const pollData = await fetchPollData(pollId);
      if (!pollData || !pollData.exist) return null;

      // Get results
      const results = await fetchPollResults(pollId);
      
      // Check if user has voted
      const hasVoted = address ? await checkHasVoted(pollId, address) : false;
      
      // Check if poll is active
      const isActive = Date.now() / 1000 < pollData.endTime;
      
      // Calculate total votes
      const totalVotes = results.reduce((sum, votes) => sum + votes, 0);

      return {
        pollId,
        poll: pollData,
        results,
        totalVotes,
        hasVoted,
        isActive,
      };
    } catch (error) {
      console.error(`Error loading poll ${pollId}:`, error);
      return null;
    }
  }, [address]);

  const fetchPollData = useCallback(async (pollId: number): Promise<Poll | null> => {
    try {
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "polls",
        args: [pollId],
      });
      
      if (!data) return null;
      
      // The contract returns a tuple: [question, startTime, endTime, exist]
      const [question, startTime, endTime, exist] = data as [string, number, number, boolean];
      
      // Note: The contract doesn't return options array in the polls mapping
      // This would need to be handled differently in a real implementation
      // For now, we'll return empty options array
      return {
        question,
        options: [], // Will be empty as we can't get options from the current contract structure
        startTime: Number(startTime),
        endTime: Number(endTime),
        exist,
      };
    } catch (error) {
      console.error("Error fetching poll data:", error);
      return null;
    }
  }, [publicClient]);

  const fetchPollResults = useCallback(async (pollId: number): Promise<number[]> => {
    try {
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "currentResult",
        args: [pollId],
      });
      
      return data ? data.map(Number) : [];
    } catch (error) {
      console.error("Error fetching poll results:", error);
      return [];
    }
  }, [publicClient]);

  const checkHasVoted = useCallback(async (pollId: number, userAddress: string): Promise<boolean> => {
    try {
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "hasVoted",
        args: [pollId, userAddress as `0x${string}`],
      });
      
      return data || false;
    } catch (error) {
      console.error("Error checking vote status:", error);
      return false;
    }
  }, [publicClient]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  return {
    polls,
    loading,
    refreshPolls: fetchPolls,
    fetchPoll,
  };
}

export function useCreatePoll() {
  const { writeContractAsync } = useWriteContract();

  const createPoll = useCallback(async (
    question: string,
    options: string[],
    deadline: number
  ) => {
    try {
      const result = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "createPoll",
        args: [question, options, deadline],
      });

      return result;
    } catch (error) {
      console.error("Error creating poll:", error);
      throw error;
    }
  }, [writeContractAsync]);

  return { createPoll };
}

export function useVote() {
  const { writeContractAsync } = useWriteContract();

  const vote = useCallback(async (pollId: number, option: string) => {
    try {
      const result = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "vote",
        args: [pollId, option],
      });

      return result;
    } catch (error) {
      console.error("Error voting:", error);
      throw error;
    }
  }, [writeContractAsync]);

  return { vote };
}
