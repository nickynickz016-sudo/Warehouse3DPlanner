import React, { useState } from 'react';
import { Shield, Lock, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

const LoginModal: React.FC<Props> = ({ isOpen, onClose, onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') {
      onLogin();
      setPassword('');
      setError(false);
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-2xl border-t-4 border-brand-accent overflow-hidden">
        <div className="p-6 bg-brand-primary text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="text-brand-accent" size={24} />
            <h2 className="text-xl font-bold">Administrator Access</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={32} className="text-brand-primary" />
            </div>
            <p className="text-gray-600 text-sm">Enter your credentials to access editing features.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-gray-200 rounded p-3 focus:border-brand-accent focus:ring-0 outline-none transition-colors font-mono"
              placeholder="••••••"
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mt-2 font-bold">Incorrect password. Try 'admin'.</p>}
          </div>

          <button 
            type="submit"
            className="w-full bg-brand-accent text-black font-bold py-3 rounded hover:bg-yellow-400 transition-transform active:scale-95 shadow-md"
          >
            UNLOCK SYSTEM
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;