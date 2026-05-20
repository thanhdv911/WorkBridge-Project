import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../services/signalrService';

const Offers = () => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchOffers();

        // Real-time: offer status changed (new offer from employer, or accepted/declined)
        const onOfferChanged = () => fetchOffers();
        signalRService.on('OfferStatusChanged', onOfferChanged);
        return () => signalRService.off('OfferStatusChanged', onOfferChanged);
    }, []);

    const fetchOffers = async () => {
        try {
            const response = await api.get('/offers/my', {
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

    const acceptOffer = async (offerId) => {
        setProcessingId(offerId);
        try {
            await api.patch(`/offers/${offerId}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Offer accepted. You are now an employee.');
            fetchOffers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not accept offer.');
        } finally {
            setProcessingId(null);
        }
    };

    const declineOffer = async (offerId) => {
        setProcessingId(offerId);
        try {
            await api.patch(`/offers/${offerId}/decline`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Offer declined.');
            fetchOffers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not decline offer.');
        } finally {
            setProcessingId(null);
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

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-bg-light">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-bg-light min-h-screen pb-20 font-display">
            <div className="bg-white border-b border-slate-200/60 pb-10 pt-8">
                <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">My Offers</h1>
                    <p className="text-slate-500 mt-2">Accept an official offer to become an employee and unlock shifts/payroll.</p>
                </div>
            </div>

            <main className="max-w-[1320px] mx-auto px-6 lg:px-10 mt-10">
                {offers.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-14 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-slate-300">contract</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-700">No offers yet</h2>
                        <p className="text-slate-500 mt-2">When an employer sends an offer, it will appear here.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {offers.map(offer => (
                            <div key={offer.offerId} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 md:p-8 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-5 lg:items-center">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusClass(offer.status)}`}>
                                            {offer.status}
                                        </span>
                                        <span className="text-xs text-slate-400">Payday: day {offer.paydayOfMonth}</span>
                                    </div>
                                    <h2 className="text-xl font-black text-slate-800 truncate">{offer.position}</h2>
                                    <p className="text-sm text-slate-500 mt-1 truncate">{offer.companyName} - {offer.branchName}</p>
                                    <p className="text-sm text-slate-500 truncate">{offer.jobTitle}</p>
                                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                                        <span className="px-3 py-2 rounded-xl bg-primary/10 text-primary font-bold">
                                            {Number(offer.hourlyRate).toLocaleString()} VND/hour
                                        </span>
                                        <span className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold">
                                            Start {new Date(offer.startDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {offer.status === 'Sent' && (
                                    <div className="flex gap-2 lg:justify-end">
                                        <button
                                            disabled={processingId === offer.offerId}
                                            onClick={() => acceptOffer(offer.offerId)}
                                            className="h-11 px-6 rounded-xl bg-emerald-500 text-white font-bold text-sm disabled:opacity-60"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            disabled={processingId === offer.offerId}
                                            onClick={() => declineOffer(offer.offerId)}
                                            className="h-11 px-6 rounded-xl bg-red-50 text-red-500 font-bold text-sm border border-red-100 disabled:opacity-60"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Offers;
