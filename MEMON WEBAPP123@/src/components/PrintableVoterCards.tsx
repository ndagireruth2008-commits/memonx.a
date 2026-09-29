import React, { useState } from 'react';
import { School, StudentVoter } from '../types';
import { Printer, Download, Search, CheckCircle2, AlertCircle, ArrowLeft, Filter } from 'lucide-react';
import { MemonLogo } from './MemonLogo';

interface PrintableVoterCardsProps {
  school: School;
  voters: StudentVoter[];
  onBack: () => void;
}

export const PrintableVoterCards: React.FC<PrintableVoterCardsProps> = ({
  school,
  voters,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unvoted' | 'voted'>('all');
  const [cardsPerPage, setCardsPerPage] = useState<6 | 8>(8);

  const filteredVoters = voters.filter((voter) => {
    const vCode = (voter.voterCode || '').toLowerCase();
    const matchesSearch =
      vCode.includes(searchTerm.toLowerCase()) ||
      String(voter.studentIndex).includes(searchTerm);
    if (filterStatus === 'unvoted') return matchesSearch && !voter.hasVoted;
    if (filterStatus === 'voted') return matchesSearch && voter.hasVoted;
    return matchesSearch;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Student Index', 'Voter ID Code', 'School Name', 'Registration Number', 'Status', 'Voted Timestamp'];
    const rows = voters.map((v) => [
      v.studentIndex,
      v.voterCode || 'N/A',
      `"${school.name.replace(/"/g, '""')}"`,
      school.regNumber,
      v.hasVoted ? 'VOTED' : 'READY TO VOTE',
      v.votedAt || 'N/A',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${school.name.replace(/\s+/g, '_')}_Voter_IDs.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] p-4 sm:p-8 selection:bg-blue-600 selection:text-white">
      {/* Control Bar - Hidden during print */}
      <div className="no-print max-w-6xl mx-auto mb-8 bg-[#121214] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button
              id="back-to-dashboard-btn"
              onClick={onBack}
              className="p-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl transition flex items-center gap-2 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                <span>Printable Student Voter Slips</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono">
                  {filteredVoters.length} Cards
                </span>
              </h2>
              <p className="text-xs text-white/40">
                {school.name} ({school.regNumber}) • Code: <strong className="text-blue-400 font-mono">{school.schoolCode}</strong>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="export-voters-csv-btn"
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl font-semibold text-xs flex items-center gap-2 transition border border-white/10 shadow-sm uppercase tracking-wider"
            >
              <Download className="w-4 h-4 text-blue-400" />
              Export CSV
            </button>
            <button
              id="trigger-print-btn"
              onClick={handlePrint}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-950/50 transition transform active:scale-95 uppercase tracking-wider"
            >
              <Printer className="w-4 h-4" />
              Print Voter Cards (A4)
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 text-sm">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              id="search-voters-input"
              type="text"
              placeholder="Search code or roll #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Filter className="w-4 h-4 text-white/40" />
            <span className="text-xs text-white/40">Filter:</span>
            <div className="inline-flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterStatus === 'all' ? 'bg-blue-600 text-white font-medium' : 'text-white/40 hover:text-white'
                }`}
              >
                All ({voters.length})
              </button>
              <button
                onClick={() => setFilterStatus('unvoted')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterStatus === 'unvoted' ? 'bg-blue-600 text-white font-medium' : 'text-white/40 hover:text-white'
                }`}
              >
                Ready ({voters.filter((v) => !v.hasVoted).length})
              </button>
              <button
                onClick={() => setFilterStatus('voted')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterStatus === 'voted' ? 'bg-blue-600 text-white font-medium' : 'text-white/40 hover:text-white'
                }`}
              >
                Used ({voters.filter((v) => v.hasVoted).length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print Instructions Notice */}
      <div className="no-print max-w-6xl mx-auto mb-6 p-4 rounded-xl bg-[#121214] border border-blue-500/20 text-white/70 text-xs flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
        <div>
          <strong className="text-white">Printing Tip:</strong> For optimal physical distribution, click <em>Print Voter Cards</em> and choose
          "Fit to Printable Area" or "Landscape/Portrait" in your browser's print dialog. Cut along the dashed border lines
          and distribute to students on election day.
        </div>
      </div>

      {/* Printable Sheet Grid */}
      <div className="max-w-6xl mx-auto bg-white text-slate-900 rounded-2xl p-4 sm:p-8 shadow-2xl print:p-0 print:m-0 print:shadow-none print:w-full">
        {filteredVoters.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <p>No voter slips matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 print:grid-cols-2 print:gap-4 print:text-black">
            {filteredVoters.map((voter) => (
              <div
                key={voter.id}
                className="break-inside-avoid relative border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 print:bg-white flex flex-col justify-between overflow-hidden shadow-sm"
              >
                {/* School & Platform Header */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs">
                      MX
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs leading-tight uppercase font-brand tracking-wider line-clamp-1">
                        {school.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Reg: {school.regNumber}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 uppercase tracking-wider font-mono">
                    Pupil #{voter.studentIndex}
                  </span>
                </div>

                {/* Secret Voter Identification Number */}
                <div className="my-2.5 text-center bg-white border border-slate-200 rounded-lg p-2.5 shadow-inner">
                  <div className="flex items-center justify-center gap-1 text-[9px] uppercase font-semibold text-slate-500 tracking-wider mb-1">
                    <span>Unpredictable Student Voter ID</span>
                  </div>
                  <div className="text-base sm:text-lg font-extrabold tracking-wider font-mono-code text-slate-950 selection:bg-yellow-200 break-all py-0.5 px-1 bg-slate-50 rounded border border-slate-100">
                    {voter.voterCode}
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1 px-1">
                    <span>Roll #{voter.studentIndex}</span>
                    <span>School: <strong className="text-slate-800 font-mono">{school.schoolCode}</strong></span>
                  </div>
                </div>

                {/* QR Mockup & Security Badge */}
                <div className="flex items-center justify-between text-[9px] text-slate-600 pt-2 border-t border-slate-200">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800">Memon Xule Voting Slip</span>
                    <span className="text-slate-500">1. Open voting kiosk</span>
                    <span className="text-slate-500">2. Enter school & ID above</span>
                  </div>
                  {/* Decorative Simulated Barcode / QR */}
                  <div className="flex flex-col items-end">
                    <div className="flex gap-[2px] h-5 items-end">
                      <span className="w-1 h-full bg-slate-800"></span>
                      <span className="w-[1px] h-full bg-slate-800"></span>
                      <span className="w-2 h-full bg-slate-800"></span>
                      <span className="w-1 h-3 bg-slate-800"></span>
                      <span className="w-[1.5px] h-full bg-slate-800"></span>
                      <span className="w-2 h-full bg-slate-800"></span>
                      <span className="w-1 h-4 bg-slate-800"></span>
                    </div>
                    <span className="text-[8px] font-mono text-slate-400 mt-0.5">Confidential Ballot</span>
                  </div>
                </div>

                {/* Status Watermark if Voted */}
                {voter.hasVoted && (
                  <div className="no-print absolute inset-0 bg-emerald-950/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                    <div className="bg-emerald-600/90 text-white font-bold text-xs uppercase px-3 py-1 rounded-full shadow flex items-center gap-1.5 transform -rotate-12 border border-white">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Voted on {voter.votedAt ? new Date(voter.votedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Record'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
