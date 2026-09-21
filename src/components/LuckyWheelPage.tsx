import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, updateDoc, addDoc, query, where } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function LuckyWheelPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [couponId, setCouponId] = useState<string | null>(null);
  
  const [probabilities, setProbabilities] = useState<any>(null);
  const [prizeOptions, setPrizeOptions] = useState<string[]>([]);
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [wonPrize, setWonPrize] = useState<string | null>(null);
  
  const [rotationDegrees, setRotationDegrees] = useState(0);
  
  useEffect(() => {
    // Fetch probabilities
    const fetchConfig = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'system/luckyWheelConfig'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProbabilities(data);
          setPrizeOptions(Object.keys(data));
        } else {
          const defaultData = {
            'Better Luck Next Time': 38,
            'Free Delivery': 40,
            'Shawarma @ ₹79': 10,
            '₹50 OFF Coupon': 5,
            'Chicken Biryani @ ₹99': 7
          };
          setProbabilities(defaultData);
          setPrizeOptions(Object.keys(defaultData));
        }
      } catch (err) {
        console.error("Error fetching config", err);
      }
    };
    fetchConfig();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !code) {
      toast.error('Please enter both Phone and Code');
      return;
    }
    
    setIsVerifying(true);
    try {
      const q = query(collection(db, 'luckyWheelCoupons'), where('code', '==', code.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast.error('Invalid OTP Code');
        setIsVerifying(false);
        return;
      }
      
      let validCouponId = null;
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'unused') {
          validCouponId = docSnap.id;
        }
      });
      
      if (!validCouponId) {
        toast.error('This OTP has already been used.');
        setIsVerifying(false);
        return;
      }
      
      setCouponId(validCouponId);
      toast.success('Code Verified! You may spin the wheel.');
    } catch (err) {
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const getRandomPrize = () => {
    let rand = Math.random() * 100;
    let sum = 0;
    for (const [prize, chance] of Object.entries(probabilities)) {
      sum += (chance as number);
      if (rand <= sum) return prize;
    }
    return prizeOptions[0];
  };

  const handleSpin = async () => {
    if (isSpinning || hasSpun || !couponId) return;
    
    setIsSpinning(true);
    
    const selectedPrize = getRandomPrize();
    const prizeIndex = prizeOptions.indexOf(selectedPrize);
    
    // Calculate rotation
    const segmentAngle = 360 / prizeOptions.length;
    // Base rotations (e.g. 5 full spins) + angle to land on the specific prize slice
    // We want the top of the wheel (270 degrees normally, or 0 depending on offset) to point to the prize.
    // Let's assume slice 0 is at top, slice 1 is at right...
    // The pointer is at the top (0 degrees).
    const randomOffset = Math.random() * segmentAngle * 0.8; // Random position within the slice
    const targetAngle = 360 * 5 + (360 - (prizeIndex * segmentAngle)) - randomOffset;
    
    setRotationDegrees(prev => prev + targetAngle);

    // Wait for animation
    setTimeout(async () => {
      setIsSpinning(false);
      setHasSpun(true);
      setWonPrize(selectedPrize);
      
      // Update DB
      try {
        await updateDoc(doc(db, 'luckyWheelCoupons', couponId), {
          status: 'used'
        });
        
        await addDoc(collection(db, 'luckyWheelSpins'), {
          phone,
          code: code.toUpperCase(),
          prize: selectedPrize,
          status: 'won',
          timestamp: new Date().toISOString()
        });
        
        if (selectedPrize === 'Better Luck Next Time') {
          toast('Better luck next time!', { icon: '😢' });
        } else {
          toast.success(`You won: ${selectedPrize}! 🎉`, { duration: 5000 });
        }
      } catch (err) {
        console.error('Failed to save spin results', err);
      }
    }, 5000); // 5 seconds spin animation
  };
  
  const handleClaim = () => {
    let cleanPhone = '+919606001790'; // Admin Phone to send claim to
    let message = `Hello Moms Magic! 🎡\n\nI just spun the Lucky Wheel and won: *${wonPrize}*! 🎉\n\nMy Phone Number: ${phone}\nOTP Code Used: ${code.toUpperCase()}`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.location.href = waUrl;
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-30%] right-[-10%] w-[70%] h-[70%] bg-[#FF4D00]/10 rounded-full blur-[250px] animate-pulse pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#121620]/80 backdrop-blur-2xl border border-white/5 rounded-[35px] p-8 shadow-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            🎡 Lucky <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">Wheel</span>
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Spin to win exciting prizes!</p>
        </div>

        {!couponId ? (
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-yellow-500 uppercase tracking-[3px] ml-1">Your Phone Number</label>
              <input 
                required
                type="tel" 
                placeholder="10-digit number" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-6 py-4 bg-white/5 rounded-2xl border border-white/10 focus:border-yellow-500/30 outline-none font-bold text-sm text-white transition-all placeholder:text-white/15"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-yellow-500 uppercase tracking-[3px] ml-1">One-Time Code</label>
              <input 
                required
                type="text" 
                placeholder="Enter 6-digit OTP" 
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="w-full px-6 py-4 bg-white/5 rounded-2xl border border-white/10 focus:border-yellow-500/30 outline-none font-bold text-sm text-white transition-all placeholder:text-white/15 uppercase"
              />
            </div>
            <button 
              type="submit" 
              disabled={isVerifying}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 text-matte-black font-black text-xs uppercase tracking-[3px] hover:scale-105 transition-all disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Unlock Wheel'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center space-y-8">
            
            {/* The Wheel */}
            <div className="relative w-64 h-64 md:w-80 md:h-80">
              {/* Pointer */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-white z-20 shadow-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
              
              {/* Wheel Graphic */}
              <div 
                className="w-full h-full rounded-full border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)] overflow-hidden relative"
                style={{ 
                  transform: `rotate(${rotationDegrees}deg)`,
                  transition: isSpinning ? 'transform 5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
                }}
              >
                {/* Clean Conic Gradient Wheel Background */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(
                      #FF4D00 0deg 72deg, 
                      #FFB700 72deg 144deg, 
                      #4CD964 144deg 216deg, 
                      #007AFF 216deg 288deg, 
                      #FF2D55 288deg 360deg
                    )`
                  }}
                />
                
                {/* Text Labels */}
                {prizeOptions.map((prize, i) => {
                  const angle = 360 / prizeOptions.length;
                  const rotate = (i * angle) + (angle / 2);
                  return (
                    <div 
                      key={prize}
                      className="absolute top-0 left-0 w-full h-full flex items-start justify-center text-center pt-8 text-[10px] font-black uppercase text-white shadow-black drop-shadow-md z-10"
                      style={{
                        transform: `rotate(${rotate}deg)`,
                        transformOrigin: '50% 50%',
                      }}
                    >
                      <span className="w-20 break-words block drop-shadow-lg">{prize}</span>
                    </div>
                  );
                })}
                
                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full z-20 shadow-xl border-4 border-yellow-500"></div>
              </div>
            </div>

            {!hasSpun ? (
              <button 
                onClick={handleSpin}
                disabled={isSpinning || !probabilities}
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 text-matte-black font-black text-xl uppercase tracking-[3px] hover:scale-105 transition-all disabled:opacity-50 animate-pulse shadow-[0_10px_30px_rgba(234,179,8,0.3)] cursor-pointer"
              >
                {isSpinning ? 'Spinning...' : 'SPIN NOW!'}
              </button>
            ) : (
              <div className="w-full text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h3 className="text-2xl font-black text-yellow-400">Result:</h3>
                <p className="text-xl font-bold">{wonPrize}</p>
                {wonPrize !== 'Better Luck Next Time' && (
                  <button 
                    onClick={handleClaim}
                    className="w-full mt-4 h-14 rounded-2xl bg-[#4CD964] text-white font-black text-sm uppercase tracking-[2px] hover:scale-105 transition-all shadow-[0_10px_20px_rgba(76,217,100,0.2)] cursor-pointer"
                  >
                    Claim on WhatsApp
                  </button>
                )}
              </div>
            )}
            
          </div>
        )}
      </motion.div>
    </div>
  );
}
