import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import { Search, Image, Paperclip, Smile, MoreVertical, Send, ArrowLeft, X, Archive, ArchiveRestore, Trash2, AlertTriangle } from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatTab, setChatTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmChat, setDeleteConfirmChat] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    const chatId = location.state?.chatId;
    if (chatId && conversations.length > 0) {
      const chat = conversations.find((c) => c.id === chatId);
      if (chat) {
        openChat(chat);
        window.history.replaceState({}, '');
      }
    }
  }, [conversations, location.state]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
      handleRemoveImage();
    }
  }, [selectedChat]);

  const loadChats = async () => {
    setLoading(true);
    try {
      const data = await api.getChats();
      setConversations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openChat = (chat) => {
    setSelectedChat(chat);
  };

  const loadMessages = async (chatId) => {
    try {
      // Backend auto-marks messages as read when fetched
      const data = await api.getChatMessages(chatId);
      setMessages(data);
      // Update local conversation state: zero out unread_count for this chat
      setConversations(prev =>
        prev.map(c => c.id === chatId ? { ...c, unread_count: 0 } : c)
      );
      // Notify sidebar badge to re-fetch and decrement immediately
      window.dispatchEvent(new Event('chats-read'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !selectedChat) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(selectedChat.id, newMessage.trim(), selectedImage);
      setMessages((prev) => [...prev, msg]);
      setNewMessage('');
      handleRemoveImage();
      // Update conversation list to show latest message
      const previewText = newMessage.trim() || '📷 Photo';
      setConversations(prev => prev.map(c => c.id === selectedChat.id ? { ...c, last_message: { content: previewText, sender: user.username, created_at: new Date() }, unread_count: 0 } : c));
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleToggleArchive = async (e, chat) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.archiveChat(chat.id);
      const isArch = res.is_archived;
      setConversations((prev) =>
        prev.map((c) => (c.id === chat.id ? { ...c, is_archived: isArch } : c))
      );
      if (selectedChat?.id === chat.id) {
        setSelectedChat((prev) => ({ ...prev, is_archived: isArch }));
      }
    } catch (err) {
      console.error('Failed to toggle archive:', err);
    }
  };

  const handleDeleteChat = async (chat) => {
    try {
      await api.deleteChat(chat.id);
      setConversations((prev) => prev.filter((c) => c.id !== chat.id));
      if (selectedChat?.id === chat.id) {
        setSelectedChat(null);
      }
      setDeleteConfirmChat(null);
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const getChatName = (chat) => {
    if (user.role === 'client') {
      return `${chat.hairdresser_details?.first_name || chat.hairdresser_details?.username} @ ${chat.salon_details?.name}`;
    }
    return `${chat.client_details?.first_name || chat.client_details?.username} @ ${chat.salon_details?.name}`;
  };

  const getChatAvatar = (chat) => {
    if (user.role === 'client') {
      return (chat.hairdresser_details?.first_name?.charAt(0) || chat.hairdresser_details?.username?.charAt(0) || '?');
    }
    return (chat.client_details?.first_name?.charAt(0) || chat.client_details?.username?.charAt(0) || '?');
  };

  const activeCount = conversations.filter((c) => !c.is_archived).length;
  const archivedCount = conversations.filter((c) => Boolean(c.is_archived)).length;

  const filteredConversations = conversations.filter((c) => {
    const isArchived = Boolean(c.is_archived);
    if (chatTab === 'archived' && !isArchived) return false;
    if (chatTab === 'all' && isArchived) return false;
    if (!searchQuery.trim()) return true;
    const name = getChatName(c).toLowerCase();
    const lastMsg = (c.last_message?.content || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || lastMsg.includes(q);
  });

  return (
    <div className="chats-page">
      {!selectedChat ? (
        <>
          <header className="page-header">
            <h1>Messages</h1>
            <p>Stay in touch with your stylists</p>
          </header>

          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search messages..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              className={`btn btn-sm ${chatTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setChatTab('all')}
              style={{ borderRadius: '20px', padding: '6px 16px' }}
            >
              All ({activeCount})
            </button>
            <button
              className={`btn btn-sm ${chatTab === 'archived' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setChatTab('archived')}
              style={{ borderRadius: '20px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Archive size={14} /> Archived ({archivedCount})
            </button>
          </div>

          {loading ? (
            <div className="page-loading">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="empty-state">
              <p>
                {chatTab === 'archived'
                  ? 'No archived conversations.'
                  : searchQuery
                  ? 'No conversations found matching your search.'
                  : 'No conversations yet. Book an appointment to start chatting!'}
              </p>
            </div>
          ) : (
            <div className="conversations-list">
              {filteredConversations.map((chat, idx) => (
                <div
                  key={chat.id}
                  className={`conversation-card card ${chat.unread_count > 0 ? 'conv-unread' : ''}`}
                  onClick={() => openChat(chat)}
                  style={{ animationDelay: `${idx * 0.04}s`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div className="conv-avatar">{getChatAvatar(chat)}</div>
                    <div className="conv-content" style={{ flex: 1, minWidth: 0 }}>
                      <div className="conv-row1">
                        <h4>{getChatName(chat)}</h4>
                        <span className="conv-time">
                          {chat.last_message ? new Date(chat.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="conv-preview" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {chat.last_message ? `${chat.last_message.sender}: ${chat.last_message.content}` : 'No messages yet'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
                    {chat.unread_count > 0 && <div className="conv-dot" />}
                    <button
                      className="btn btn-ghost btn-sm"
                      title={chat.is_archived ? 'Unarchive' : 'Archive'}
                      onClick={(e) => handleToggleArchive(e, chat)}
                      style={{ color: 'var(--text-secondary)', padding: '6px 8px' }}
                    >
                      {chat.is_archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Delete conversation"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmChat(chat);
                      }}
                      style={{ color: 'var(--danger)', padding: '6px 8px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="chat-view animate-fade-in">
          <div className="chat-header">
            <button className="btn btn-ghost" onClick={() => setSelectedChat(null)}>
              <ArrowLeft size={20} />
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>{getChatName(selectedChat)}</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                {selectedChat.salon_details?.name}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                className="btn btn-ghost btn-sm"
                title={selectedChat.is_archived ? 'Unarchive conversation' : 'Archive conversation'}
                onClick={(e) => handleToggleArchive(e, selectedChat)}
                style={{ color: 'var(--text-secondary)' }}
              >
                {selectedChat.is_archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                title="Delete conversation"
                onClick={() => setDeleteConfirmChat(selectedChat)}
                style={{ color: 'var(--danger)' }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-chat-state">
                <div className="empty-chat-avatar">{getChatAvatar(selectedChat)}</div>
                <p>Start the conversation</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender === user.id;
                const mediaUrl = msg.image_url || msg.image;
                return (
                  <div key={msg.id} className={`message-bubble ${isMe ? 'message-mine' : 'message-theirs'}`}>
                    <div className="message-sender">{msg.sender_details?.first_name || msg.sender}</div>
                    {mediaUrl && (
                      <div style={{ marginBottom: msg.content ? '8px' : '0', marginTop: '4px' }}>
                        <img
                          src={mediaUrl}
                          alt="Attachment"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '280px',
                            borderRadius: '8px',
                            objectFit: 'contain',
                            display: 'block',
                            cursor: 'pointer',
                            background: '#00000010'
                          }}
                          onClick={() => window.open(mediaUrl, '_blank')}
                        />
                      </div>
                    )}
                    {msg.content && <div className="message-content">{msg.content}</div>}
                    <div className="message-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                );
              })
            )}
          </div>

          {imagePreview && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: 'var(--bg-main)',
              borderTop: '1px solid var(--border-light)'
            }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: '54px', height: '54px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 500, display: 'block' }}>{selectedImage?.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {selectedImage?.size ? `${(selectedImage.size / 1024).toFixed(1)} KB` : ''}
                </span>
              </div>
            </div>
          )}

          <form className="chat-input-bar" onSubmit={handleSendMessage}>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageSelect}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              title="Browse picture from PC"
              onClick={handleImageButtonClick}
            >
              <Image size={20} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              title="Attach picture"
              onClick={handleImageButtonClick}
            >
              <Paperclip size={20} />
            </button>
            <input
              type="text"
              placeholder="Type a message..."
              className="chat-input"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button type="button" className="btn btn-ghost btn-sm"><Smile size={20} /></button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={sending || (!newMessage.trim() && !selectedImage)}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {deleteConfirmChat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '24px', background: 'var(--bg-surface, #fff)', borderRadius: 'var(--radius-lg, 12px)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', color: 'var(--danger, #ef4444)' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Delete Conversation?</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #4b5563)', marginBottom: '22px', lineHeight: 1.5 }}>
              This conversation with <strong>{getChatName(deleteConfirmChat)}</strong> will be removed from your chat list. The other party will still see their conversation history unless they also delete it.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirmChat(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--danger, #ef4444)', borderColor: 'var(--danger, #ef4444)', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleDeleteChat(deleteConfirmChat)}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
