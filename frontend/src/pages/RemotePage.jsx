export default function RemotePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="text-center w-full max-w-sm">
        <p className="text-slate-500 text-sm uppercase tracking-widest mb-4">
          ReLiveTV — Remote Mode
        </p>
        <h1 className="text-5xl font-bold mb-8">📱 Remote</h1>

        <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl">
          <p className="text-slate-400 mb-4 text-sm">Enter TV code</p>
          <input
            type="text"
            placeholder="ABC123"
            maxLength={6}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-widest uppercase mb-6 focus:outline-none focus:border-red-500"
            disabled
          />
          <button
            disabled
            className="w-full bg-red-500 text-white font-semibold py-3 rounded-lg opacity-50 cursor-not-allowed"
          >
            Connect (coming in Step 4)
          </button>
        </div>

        <p className="text-slate-500 mt-8 text-xs">
          Step 1.E placeholder — no functionality yet
        </p>
      </div>
    </div>
  );
}