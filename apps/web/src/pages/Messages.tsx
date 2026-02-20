import { useState } from 'react';
import { Search, Phone, Video, Send, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  unread: number;
  color: string;
  initial: string;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  time: string;
  isMine: boolean;
}

const mockContacts: Contact[] = [
  { id: '1', name: 'Anne Gloindian', lastMessage: 'Sed veroed eos accusamus.', unread: 3, color: 'bg-green-500', initial: 'A' },
  { id: '2', name: 'Hope Furaletter', lastMessage: 'Sed veroed eos accusamus.', unread: 2, color: 'bg-orange-500', initial: 'H' },
  { id: '3', name: 'Sarah Moanees', lastMessage: 'Sed veroed eos accusamus.', unread: 3, color: 'bg-pink-500', initial: 'S' },
  { id: '4', name: 'Lynne Gwistic', lastMessage: 'Sed veroed eos accusamus.', unread: 2, color: 'bg-green-400', initial: 'L' },
  { id: '5', name: 'Anne Gloindian', lastMessage: 'Sed veroed eos accusamus.', unread: 3, color: 'bg-purple-500', initial: 'A' },
  { id: '6', name: 'Hope Furaletter', lastMessage: 'Sed veroed eos accusamus.', unread: 2, color: 'bg-orange-400', initial: 'H' },
  { id: '7', name: 'Anne Gloindian', lastMessage: 'Sed veroed eos accusamus.', unread: 3, color: 'bg-red-500', initial: 'A' },
];

const mockMessages: Record<string, Message[]> = {
  '1': [
    { id: '1', senderId: '1', text: 'At vero eos accusamus et iusto dignissimos ducimus praesentium volup.', time: '2:00 PM', isMine: false },
    { id: '2', senderId: 'me', text: 'But I must explain to you how all this mistaken idea and much more.', time: '2:05 PM', isMine: true },
    { id: '3', senderId: '1', text: 'At vero eos accusamus et iusto dignissimos ducimus praesentium volup.', time: '2:00 PM', isMine: false },
    { id: '4', senderId: 'me', text: 'But I must explain you how all  this mistaken idea and much more.', time: '2:00 PM', isMine: true },
  ],
};

export function MessagesPage() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = mockContacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const messages = selectedContact ? mockMessages[selectedContact.id] || [] : [];

  const handleSend = () => {
    if (!messageText.trim()) return;
    // TODO: send message
    setMessageText('');
  };

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
        <div className="flex h-full">
          {/* Contacts List */}
          <div className="w-[380px] border-r border-gray-200 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Qidirish..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>
            </div>

            <div className="px-4 py-2">
              <span className="text-sm font-medium text-gray-500">Personal</span>
            </div>

            {/* Contacts */}
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50',
                    selectedContact?.id === contact.id && 'bg-orange-50'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm', contact.color)}>
                    {contact.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{contact.name}</p>
                    <p className="text-xs text-gray-500 truncate">{contact.lastMessage}</p>
                  </div>
                  {contact.unread > 0 && (
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {contact.unread}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedContact ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm', selectedContact.color)}>
                      {selectedContact.initial}
                    </div>
                    <span className="text-lg font-semibold text-gray-900">{selectedContact.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors">
                      <Phone size={18} />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition-colors">
                      <Video size={18} />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="text-center">
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Today</span>
                  </div>

                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={cn('flex', message.isMine ? 'justify-end' : 'justify-start')}
                    >
                      <div className="flex items-end gap-2 max-w-[70%]">
                        {!message.isMine && (
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0', selectedContact.color)}>
                            {selectedContact.initial}
                          </div>
                        )}
                        <div
                          className={cn(
                            'px-4 py-3 rounded-2xl',
                            message.isMine
                              ? 'bg-orange-500 text-white rounded-br-md'
                              : 'bg-gray-100 text-gray-900 rounded-bl-md'
                          )}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p className={cn('text-[10px] mt-1 text-right', message.isMine ? 'text-white/70' : 'text-gray-400')}>
                            {message.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <button className="text-gray-400 hover:text-orange-500 transition-colors">
                      <Smile size={22} />
                    </button>
                    <input
                      type="text"
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                      placeholder="Write Message..."
                      className="flex-1 h-10 px-4 border border-gray-300 rounded-full focus:outline-none focus:border-orange-500 text-sm"
                    />
                    <button
                      onClick={handleSend}
                      className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition-colors"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-400 text-lg">No Chat History Available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
