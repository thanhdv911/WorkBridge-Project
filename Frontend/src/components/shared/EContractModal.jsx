import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const EContractModal = ({ isOpen, onClose, applicationId }) => {
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [agreed, setAgreed] = useState(false);
    const [showDisputeForm, setShowDisputeForm] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    useEffect(() => {
        if (isOpen && applicationId) {
            fetchContract();
        }
    }, [isOpen, applicationId]);

    const fetchContract = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/contracts/application/${applicationId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setContract(response.data);
        } catch (error) {
            toast.error('Could not load contract details.');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async () => {
        if (!agreed) {
            toast.error("You must agree to the terms.");
            return;
        }
        try {
            await api.post(`/contracts/${contract.contractId}/sign`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("E-Contract signed successfully!");
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to sign contract.');
        }
    };

    const handleDispute = async () => {
        if (!disputeReason.trim()) {
            toast.error("Please provide a reason for the dispute.");
            return;
        }
        try {
            await api.post(`/contracts/dispute`, {
                contractId: contract.contractId,
                reason: disputeReason
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Dispute filed successfully! It is now under review.");
            setShowDisputeForm(false);
            setDisputeReason('');
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to file dispute.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm anim-fadeUp">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider mb-2 border border-blue-100">
                            <span className="material-symbols-outlined !text-sm">contract</span>
                            Official E-Contract
                        </div>
                        <h2 className="text-2xl font-black text-slate-800">Employment Agreement</h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors shadow-sm">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : contract ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Employer</div>
                                    <div className="font-bold text-slate-800">{contract.employerName}</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Employee</div>
                                    <div className="font-bold text-slate-800">{contract.applicantName}</div>
                                </div>
                            </div>
                            
                            <div className="bg-primary/[0.03] p-5 rounded-2xl border border-primary/10">
                                <h3 className="font-black text-slate-800 mb-4">Compensation Details</h3>
                                <div className="flex items-center justify-between">
                                    <div className="font-bold text-slate-600">{contract.jobTitle}</div>
                                    <div className="text-xl font-black text-primary">
                                        {contract.agreedPayRate.toLocaleString()} <span className="text-sm text-slate-500">{contract.agreedPayUnit}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-black text-slate-800 mb-3">Terms & Conditions</h3>
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm font-medium text-slate-600 whitespace-pre-wrap leading-relaxed">
                                    {contract.terms}
                                </div>
                            </div>

                            <div className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-sm font-bold text-slate-500">Status</span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                    contract.status === 'Signed' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                                }`}>
                                    {contract.status}
                                </span>
                            </div>
                            
                            {contract.signedAt && (
                                <div className="text-right text-xs font-bold text-slate-400 italic">
                                    Digitally signed on: {new Date(contract.signedAt).toLocaleString()}
                                </div>
                            )}

                            {contract.status === 'Pending' && userRole === 'Applicant' && (
                                <div className="mt-8 pt-6 border-t border-slate-100">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <div className="relative flex items-center justify-center mt-0.5">
                                            <input 
                                                type="checkbox" 
                                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-md checked:bg-primary checked:border-primary transition-colors cursor-pointer"
                                                checked={agreed}
                                                onChange={(e) => setAgreed(e.target.checked)}
                                            />
                                            <span className="material-symbols-outlined absolute text-white text-sm opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">check</span>
                                        </div>
                                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
                                            I have read, understood, and agree to the terms and conditions outlined in this digital contract. I understand this serves as a binding agreement under WorkBridge policies.
                                        </span>
                                    </label>
                                </div>
                            )}

                            {contract.status === 'Signed' && !showDisputeForm && (
                                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                                    <button 
                                        onClick={() => setShowDisputeForm(true)}
                                        className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 uppercase tracking-wider"
                                    >
                                        <span className="material-symbols-outlined !text-[16px]">gavel</span>
                                        File a Dispute
                                    </button>
                                </div>
                            )}

                            {showDisputeForm && (
                                <div className="mt-8 pt-6 border-t border-slate-100 anim-fadeUp">
                                    <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100">
                                        <h4 className="font-black text-rose-800 mb-2 flex items-center gap-2">
                                            <span className="material-symbols-outlined !text-lg">warning</span>
                                            File a Dispute
                                        </h4>
                                        <p className="text-xs text-rose-600 mb-4 font-medium">
                                            Filing a dispute will alert the administration. Your time tracking history for this job will be automatically attached as evidence.
                                        </p>
                                        <textarea
                                            value={disputeReason}
                                            onChange={(e) => setDisputeReason(e.target.value)}
                                            placeholder="Explain the issue (e.g., unpaid wages, unfair treatment)..."
                                            className="w-full p-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-400/10 outline-none resize-none h-24 text-sm mb-3"
                                        ></textarea>
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => setShowDisputeForm(false)}
                                                className="px-4 py-2 rounded-lg text-rose-600 text-sm font-bold hover:bg-rose-100 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={handleDispute}
                                                className="px-6 py-2 rounded-lg bg-rose-600 text-white text-sm font-black hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95"
                                            >
                                                Submit Case
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 py-10 font-medium">Contract not available.</div>
                    )}
                </div>

                {contract?.status === 'Pending' && userRole === 'Applicant' && (
                    <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button 
                            onClick={onClose}
                            className="h-12 px-6 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSign}
                            disabled={!agreed}
                            className={`h-12 px-8 rounded-xl font-black text-white flex items-center gap-2 transition-all shadow-lg ${
                                agreed 
                                ? 'bg-slate-900 hover:bg-primary shadow-black/10 active:scale-95' 
                                : 'bg-slate-300 cursor-not-allowed shadow-none'
                            }`}
                        >
                            <span className="material-symbols-outlined !text-xl">draw</span>
                            Sign E-Contract
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EContractModal;
