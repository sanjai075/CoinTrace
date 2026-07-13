export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white">
      <div className="flex flex-col items-center space-y-4">
        {/* Spinner */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-purple-500 border-b-pink-500 border-l-transparent animate-spin"></div>
          <div className="absolute inset-2.5 rounded-full bg-gray-950 flex items-center justify-center">
            <span className="text-indigo-400 text-[10px] font-black tracking-widest uppercase animate-pulse">CT</span>
          </div>
        </div>
        
        {/* Pulsing loading text */}
        <div className="text-center space-y-1">
          <h2 className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 uppercase animate-pulse">
            CoinTrace
          </h2>
          <p className="text-[10px] text-gray-500 font-bold tracking-wider uppercase animate-pulse duration-1000">
            Checking Session...
          </p>
        </div>
      </div>
    </div>
  );
}