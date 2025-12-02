import React, { useState } from 'react';
import { Goal } from '../types';
import { INDIAN_RUPEE } from '../constants';
import { Plus, Trash2, Edit2, Target, CheckCircle, ExternalLink, Image as ImageIcon, X } from 'lucide-react';

interface GoalsViewProps {
  goals: Goal[];
  onAddGoal: (goal: Omit<Goal, 'id'>) => void;
  onUpdateGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
}

// Helper: Compress Goal Images (Smaller than avatar, max 400px wide)
const compressGoalImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
};

const GoalsView: React.FC<GoalsViewProps> = ({ goals, onAddGoal, onUpdateGoal, onDeleteGoal }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [deadline, setDeadline] = useState('');
  
  // New Fields State
  const [productLinks, setProductLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);

  const openAddModal = () => {
    setEditingGoal(null);
    setName('');
    setTarget('');
    setCurrent('');
    setDeadline('');
    setProductLinks([]);
    setProductImages([]);
    setIsModalOpen(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTarget(goal.targetAmount.toString());
    setCurrent(goal.currentAmount.toString());
    setDeadline(goal.deadline.split('T')[0]);
    setProductLinks(goal.productLinks || []);
    setProductImages(goal.productImages || []);
    setIsModalOpen(true);
  };

  const handleAddLink = () => {
      if(newLink) {
          setProductLinks([...productLinks, newLink]);
          setNewLink('');
      }
  };

  const handleRemoveLink = (index: number) => {
      setProductLinks(productLinks.filter((_, i) => i !== index));
  };

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const compressed = await compressGoalImage(e.target.files[0]);
          setProductImages([...productImages, compressed]);
      }
  };

  const handleRemoveImage = (index: number) => {
      setProductImages(productImages.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !target) return;

    if (editingGoal) {
      onUpdateGoal({
        ...editingGoal,
        name,
        targetAmount: parseFloat(target),
        currentAmount: parseFloat(current) || 0,
        deadline: deadline || new Date().toISOString(),
        productLinks,
        productImages
      });
    } else {
      onAddGoal({
        name,
        targetAmount: parseFloat(target),
        currentAmount: parseFloat(current) || 0,
        deadline: deadline || new Date().toISOString(),
        productLinks,
        productImages
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="bg-panel border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">Wish List</h2>
          <p className="text-sm text-gray-500">Track your financial goals and big purchases.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-6 py-3 bg-accent hover:bg-blue-400 text-obsidian font-bold rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-accent/20"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Grid of Cards (Better for images) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => {
              const percentage = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
              const isCompleted = percentage >= 100;
              const mainImage = goal.productImages && goal.productImages.length > 0 ? goal.productImages[0] : null;

              return (
                  <div key={goal.id} className="bg-panel border border-white/5 rounded-3xl overflow-hidden group hover:border-accent/30 transition-all flex flex-col">
                      {/* Image Area */}
                      <div className="h-40 bg-charcoal w-full relative overflow-hidden">
                          {mainImage ? (
                              <img src={mainImage} alt={goal.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center bg-white/5">
                                  <Target size={32} className="text-white/20" />
                              </div>
                          )}
                          <div className="absolute top-2 right-2 flex gap-2">
                              <button onClick={() => openEditModal(goal)} className="p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors"><Edit2 size={14}/></button>
                              <button onClick={() => onDeleteGoal(goal.id)} className="p-2 bg-black/50 hover:bg-rose-500/80 rounded-full text-white backdrop-blur-sm transition-colors"><Trash2 size={14}/></button>
                          </div>
                      </div>

                      {/* Content Area */}
                      <div className="p-5 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-2">
                              <h3 className="font-bold text-white text-lg truncate pr-2">{goal.name}</h3>
                              {isCompleted && <CheckCircle size={20} className="text-accent shrink-0" />}
                          </div>
                          
                          <div className="flex justify-between items-end mb-4">
                              <div>
                                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Target</p>
                                  <p className="text-sm font-mono text-gray-300">{INDIAN_RUPEE.format(goal.targetAmount)}</p>
                              </div>
                              <div className="text-right">
                                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Saved</p>
                                  <p className="text-lg font-mono font-bold text-accent">{INDIAN_RUPEE.format(goal.currentAmount)}</p>
                              </div>
                          </div>

                          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mb-4">
                                <div className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-accent' : 'bg-brand'}`} style={{ width: `${percentage}%` }}></div>
                          </div>

                          {/* Links Footer */}
                          {goal.productLinks && goal.productLinks.length > 0 && (
                              <div className="mt-auto pt-4 border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
                                  {goal.productLinks.map((link, idx) => (
                                      <a key={idx} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-blue-400 font-bold uppercase transition-colors shrink-0">
                                          <ExternalLink size={10} /> Link {idx + 1}
                                      </a>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              )
          })}
          
          {goals.length === 0 && (
              <div className="col-span-full p-12 text-center text-gray-500 bg-panel border border-white/5 rounded-3xl border-dashed">
                  <p>No items in your wish list. Start planning!</p>
              </div>
          )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative bg-panel border border-white/10 rounded-3xl w-[95%] max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/5 bg-charcoal rounded-t-3xl">
                    <h3 className="text-lg font-bold text-white uppercase tracking-tight">{editingGoal ? 'Edit Item' : 'New Wish List Item'}</h3>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">Item Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-charcoal border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-accent focus:outline-none" placeholder="e.g. New Laptop" autoFocus />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">Budget (₹)</label>
                                <input type="number" value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-charcoal border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-accent focus:outline-none" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">Saved (₹)</label>
                                <input type="number" value={current} onChange={e => setCurrent(e.target.value)} className="w-full bg-charcoal border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-accent focus:outline-none" placeholder="0.00" />
                            </div>
                        </div>
                    </div>

                    {/* Links Section */}
                    <div className="pt-4 border-t border-white/5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-2 block">Product Links</label>
                        <div className="flex gap-2 mb-2">
                            <input 
                                type="text" 
                                value={newLink} 
                                onChange={e => setNewLink(e.target.value)} 
                                className="flex-1 bg-charcoal border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-accent focus:outline-none" 
                                placeholder="Paste URL here..." 
                            />
                            <button type="button" onClick={handleAddLink} className="px-4 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-xs"><Plus size={16}/></button>
                        </div>
                        <div className="space-y-2">
                            {productLinks.map((link, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5">
                                    <ExternalLink size={12} className="text-blue-400" />
                                    <span className="flex-1 text-xs text-gray-400 truncate">{link}</span>
                                    <button type="button" onClick={() => handleRemoveLink(idx)} className="text-gray-500 hover:text-rose-500"><X size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Images Section */}
                    <div className="pt-4 border-t border-white/5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-2 block">Product Images</label>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                            {productImages.map((img, idx) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                                    <img src={img} alt="Product" className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-rose-500 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"><X size={12}/></button>
                                </div>
                            ))}
                            <label className="aspect-square rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all text-gray-500 hover:text-accent">
                                <ImageIcon size={20} />
                                <span className="text-[10px] mt-1 font-bold">Add</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleAddImage} />
                            </label>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button type="submit" className="w-full bg-accent hover:bg-blue-400 text-obsidian font-bold py-3.5 rounded-2xl transition-all uppercase tracking-wide text-sm shadow-lg shadow-accent/20">Save Item</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default GoalsView;