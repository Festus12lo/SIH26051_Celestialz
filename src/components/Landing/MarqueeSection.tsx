import React from 'react';
import { motion } from 'framer-motion';

const words = [
  'Passive Survival', 'Parametric Design', 'AI Engine',
  'Thermal Mass', 'Solar Gain', 'Extreme Climates',
  'Sustainable', 'Off-Grid', 'Adaptive Architecture'
];

export default function MarqueeSection() {
  return (
    <section className="py-20 md:py-32 w-full overflow-hidden bg-[#0C0C0C] border-y border-[#D7E2EA]/10">
      <div className="relative w-full flex whitespace-nowrap overflow-hidden">
        {/* We use two sets of words and animate them infinitely */}
        <motion.div
          className="flex whitespace-nowrap items-center"
          animate={{ x: [0, -1035] }} // Adjust width depending on actual rendered size, or use a percentage approach
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 20
          }}
          style={{ width: "fit-content" }}
        >
          <div className="flex gap-8 md:gap-16 items-center px-4 md:px-8">
            {words.map((word, i) => (
              <span key={`w1-${i}`} className="text-3xl md:text-5xl lg:text-7xl font-bold text-[#D7E2EA]/20 uppercase tracking-wider">
                {word}
              </span>
            ))}
          </div>
          <div className="flex gap-8 md:gap-16 items-center px-4 md:px-8">
            {words.map((word, i) => (
              <span key={`w2-${i}`} className="text-3xl md:text-5xl lg:text-7xl font-bold text-[#D7E2EA]/20 uppercase tracking-wider">
                {word}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
