import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface AnimatedTextProps {
  text: string;
  className?: string;
  mode?: 'scroll' | 'time';
}

export default function AnimatedText({ text, className = '', mode = 'scroll' }: AnimatedTextProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.8', 'end 0.2'],
  });

  const words = text.split(' ');

  if (mode === 'time') {
    return (
      <motion.p
        className={className}
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.015, delayChildren: 0.5 } },
        }}
      >
        {words.map((word, i) => (
          <span key={i} className="relative inline-block mr-[0.25em] mt-2">
            {word.split('').map((char, j) => (
              <motion.span
                key={j}
                variants={{
                  hidden: { opacity: 0.2 },
                  visible: { opacity: 1, transition: { duration: 0.1 } },
                }}
              >
                {char}
              </motion.span>
            ))}
          </span>
        ))}
      </motion.p>
    );
  }

  return (
    <p ref={containerRef} className={className}>
      {words.map((word, i) => {
        const start = i / words.length;
        const end = start + 1 / words.length;
        return (
          <Word key={i} progress={scrollYProgress} range={[start, end]}>
            {word}
          </Word>
        );
      })}
    </p>
  );
}

const Word = ({ children, progress, range }: { children: string; progress: any; range: [number, number] }) => {
  const amount = range[1] - range[0];
  const step = amount / children.length;
  return (
    <span className="relative inline-block mr-[0.25em] mt-2">
      {children.split('').map((char, i) => {
        const start = range[0] + i * step;
        const end = range[0] + (i + 1) * step;
        return (
          <Char key={i} progress={progress} range={[start, end]}>
            {char}
          </Char>
        );
      })}
    </span>
  );
};

const Char = ({ children, progress, range }: { children: string; progress: any; range: [number, number] }) => {
  const opacity = useTransform(progress, range, [0.2, 1]);
  return (
    <span className="relative inline-block">
      <span className="invisible">{children}</span>
      <motion.span style={{ opacity }} className="absolute left-0 top-0">
        {children}
      </motion.span>
    </span>
  );
};
