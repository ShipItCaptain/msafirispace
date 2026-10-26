import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { messagingAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const POLL_INTERVAL_MS = 15000;

const formatTimestamp = (isoString) => {
  const date = new Date(isoString);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MessageThread = ({ bookingId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await messagingAPI.getMessages(bookingId);
      setMessages(data?.results || (Array.isArray(data) ? data : []));
    } catch (_) {
      // non-blocking; keep whatever was already loaded
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    // jsdom (used by the test suite) doesn't implement scrollIntoView.
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isSending) return;
    setIsSending(true);
    try {
      const sent = await messagingAPI.sendMessage(bookingId, body);
      setMessages((prev) => [...prev, sent]);
      setDraft('');
    } catch (err) {
      toast.error(err?.response?.data?.body?.[0] || 'Could not send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Messages</h2>
      </div>

      <div className="flex-1 min-h-[220px] max-h-[360px] overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-6">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No messages yet. Say hello to get things started.
          </p>
        ) : (
          messages.map((message) => {
            const isMine = message.sender === user?.id;
            return (
              <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                    isMine ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {!isMine && (
                    <p className="text-xs font-semibold mb-0.5 text-gray-600">{message.sender_name}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-red-100' : 'text-gray-500'}`}>
                    {formatTimestamp(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-gray-100 px-3 py-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isSending}
          aria-label="Send message"
          className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default MessageThread;
