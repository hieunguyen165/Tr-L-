import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Shield, User as UserIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { User } from '../types';
import * as storageService from '../services/storage';

interface MemberManagerProps {
  currentUser: User;
}

const MemberManager: React.FC<MemberManagerProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  
  // Form State
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await storageService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users", err);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newFullName || !newUsername || !newPassword) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    try {
      await storageService.addUser({
        fullName: newFullName,
        username: newUsername,
        password: newPassword,
        role: 'member' // Default role for added users is member
      });
      
      setSuccess('Thêm thành viên thành công!');
      setNewFullName('');
      setNewUsername('');
      setNewPassword('');
      await loadData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Bạn có chắc muốn xóa thành viên này không?')) {
      try {
        await storageService.deleteUser(userId);
        await loadData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <Shield size={48} className="mb-4 text-slate-700"/>
        <p>Bạn không có quyền truy cập khu vực này.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-slate-950">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-blue-500" /> Quản lý thành viên
          </h2>
          <p className="text-slate-400 mt-1">Cấp quyền truy cập cho nhân viên hoặc cộng tác viên.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add User Form */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sticky top-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <UserPlus size={20} className="text-blue-400"/> Thêm tài khoản mới
              </h3>
              
              <form onSubmit={handleAddUser} className="space-y-4">
                {error && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex gap-2 text-xs text-red-300">
                    <AlertCircle size={16} className="shrink-0"/> {error}
                  </div>
                )}
                {success && (
                  <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3 flex gap-2 text-xs text-green-300">
                    <CheckCircle size={16} className="shrink-0"/> {success}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tên đăng nhập</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="username123"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Mật khẩu</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition shadow-lg shadow-blue-900/20"
                  >
                    Tạo tài khoản
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* User List */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-950/50 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                       <th className="p-4 font-medium">Thành viên</th>
                       <th className="p-4 font-medium">Username</th>
                       <th className="p-4 font-medium">Mật khẩu</th>
                       <th className="p-4 font-medium">Vai trò</th>
                       <th className="p-4 font-medium text-right">Hành động</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                     {users.map((user) => (
                       <tr key={user.id} className="hover:bg-slate-800/50 transition">
                         <td className="p-4">
                           <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                <UserIcon size={16} />
                             </div>
                             <div className="font-medium text-white">{user.fullName}</div>
                           </div>
                         </td>
                         <td className="p-4 text-sm text-slate-300">{user.username}</td>
                         <td className="p-4 text-sm font-mono text-slate-400">
                            {user.role === 'admin' && user.username === 'Xuanhieufi' ? '••••••' : user.password}
                         </td>
                         <td className="p-4">
                           <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                             user.role === 'admin' 
                               ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                               : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                           }`}>
                             {user.role === 'admin' ? 'Quản trị' : 'Thành viên'}
                           </span>
                         </td>
                         <td className="p-4 text-right">
                           {/* Cannot delete self or root admin */}
                           {user.id !== currentUser.id && user.username !== 'Xuanhieufi' && (
                             <button
                               onClick={() => handleDeleteUser(user.id)}
                               className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition"
                               title="Xóa thành viên"
                             >
                               <Trash2 size={16} />
                             </button>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {users.length === 0 && (
                   <div className="p-8 text-center text-slate-500">Chưa có thành viên nào.</div>
                 )}
               </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl flex gap-3 text-sm text-blue-200">
               <AlertCircle size={20} className="shrink-0 text-blue-400"/>
               <div>
                  Lưu ý: Mật khẩu được hiển thị trực tiếp để thuận tiện quản lý nội bộ. Vui lòng không sử dụng mật khẩu quan trọng cho hệ thống này.
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberManager;
