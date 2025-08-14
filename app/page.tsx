"use client";

import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "./components/DemoComponents";
import { Icon } from "./components/DemoComponents";
import { CreatePoll, PollList, VoteByPollId } from "./components/PollComponents";
import { usePollContract } from "../lib/hooks";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("polls");

  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();
  const { polls, loading, refreshPolls } = usePollContract();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddFrame}
          className="text-[var(--app-accent)] p-4"
          icon={<Icon name="plus" size="sm" />}
        >
          Save Frame
        </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Saved</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-3 h-11">
          <div>
            <div className="flex items-center space-x-2">
              <Wallet className="z-10">
                <ConnectWallet>
                  <Name className="text-inherit" />
                </ConnectWallet>
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
          <div>{saveFrameButton}</div>
        </header>

        <main className="flex-1">
          <div className="flex space-x-2 mb-4">
            <Button
              variant={activeTab === "polls" ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveTab("polls")}
              icon={<Icon name="star" size="sm" />}
            >
              Polls
            </Button>
            <Button
              variant={activeTab === "create" ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveTab("create")}
              icon={<Icon name="plus" size="sm" />}
            >
              New Poll
            </Button>
            <Button
              variant={activeTab === "vote" ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveTab("vote")}
              icon={<Icon name="check" size="sm" />}
            >
              Vote by ID
            </Button>
          </div>

          {activeTab === "polls" && (
            <div className="space-y-6 animate-fade-in">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-accent)] mx-auto"></div>
                  <p className="text-[var(--app-foreground-muted)] mt-2">Loading polls...</p>
                </div>
              ) : (
                <PollList polls={polls} onRefresh={refreshPolls} />
              )}
            </div>
          )}
          
          {activeTab === "create" && (
            <div className="space-y-6 animate-fade-in">
              <CreatePoll onPollCreated={refreshPolls} />
            </div>
          )}
          
          {activeTab === "vote" && (
            <div className="space-y-6 animate-fade-in">
              <VoteByPollId onVote={refreshPolls} />
            </div>
          )}
        </main>

        <footer className="mt-2 pt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--ock-text-foreground-muted)] text-xs"
            onClick={() => openUrl("https://basescan.org/address/0xC874dC7ABCe36E0c66a5cBA0e99B96c27Eb885E8")}
          >
            View Smart Contract on Base
          </Button>
        </footer>
      </div>
    </div>
  );
}
