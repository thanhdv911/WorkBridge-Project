import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { signalRService } from '../../services/signalrService';
import toast from 'react-hot-toast';

const EmployerOffers = () => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchOffers();

        const handleOfferChanged = () => fetchOffers();
        signalRService.on('OfferStatusChanged', handleOfferChanged);
        return () => signalRService.off('OfferStatusChanged', handleOfferChanged);
    }, []);

    const fetchOffers = async () => {
        try {
            const response = await api.get('/offers/employer', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOffers(response.data);
        } catch (error) {
            console.error('Error loading offers:', error);
            toast.error('Could not load offers.');
        } finally {
            setLoading(false);
        }
    };

    const statusClass = (status) => {
        switch (status) {
            case 'Accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'Declined': return 'bg-red-50 text-red-700 border-red-100';
            case 'Sent': return 'bg-blue-50 text-blue-700 border-blue-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    return (
        <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-w-0">
            <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Offers</h2>
                <p className="text-slate-500 text-sm mt-1">Track official job offers sent to applicants.</p>
            </div>

            {loading ? (
                <div className="p-10 text-center text-slate-400">Loading offers...</div>
            ) : offers.length === 0 ? (
                <div className="p-10 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-slate-300">contract</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">No offers yet</h3>
                    <p className="text-slate-500 mt-1">Accept an applicant, then send an offer from Review Applicants.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {offers.map(offer => (
                        <div key={offer.offerId} className="px-5 sm:px-6 py-5 grid lg:grid-cols-[minmax(0,1fr)_minmax(160px,220px)_auto] gap-4 lg:items-center">
                            <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate">{offer.applicantName}</p>
                                <p className="text-sm text-slate-500 truncate">{offer.jobTitle}</p>
                                <p className="text-xs text-slate-400 truncate">{offer.position} at {offer.branchName}</p>
                            </div>
                            <div className="text-sm text-slate-600">
                                <p className="font-bold">{Number(offer.hourlyRate).toLocaleString()} VND/hour</p>
                                <p className="text-xs text-slate-400">Start {new Date(offer.startDate).toLocaleDateString()}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusClass(offer.status)} self-start lg:self-center`}>
                                {offer.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

export default EmployerOffers;
