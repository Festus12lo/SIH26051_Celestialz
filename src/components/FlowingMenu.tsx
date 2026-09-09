import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';

export interface MenuItemData {
  link: string;
  text: string;
  image: string;
}

export interface FlowingMenuProps {
  items?: MenuItemData[];
  speed?: number;
  textColor?: string;
  bgColor?: string;
  marqueeBgColor?: string;
  marqueeTextColor?: string;
  borderColor?: string;
}

interface MenuItemProps extends MenuItemData {
  speed: number;
  textColor: string;
  marqueeBgColor: string;
  marqueeTextColor: string;
  borderColor: string;
  isFirst: boolean;
}

export const FlowingMenu: React.FC<FlowingMenuProps> = ({
  items = [],
  speed = 15,
  textColor = 'hsl(var(--foreground))',
  bgColor = 'hsl(var(--background))',
  marqueeBgColor = 'hsl(var(--primary))',
  marqueeTextColor = 'hsl(var(--primary-foreground))',
  borderColor = 'hsl(var(--border))'
}) => {
  return (
    <div className="w-full h-full overflow-hidden" style={{ backgroundColor: bgColor }}>
      <nav className="flex flex-col h-full m-0 p-0">
        {items.map((item, idx) => (
          <MenuItem
            key={idx}
            {...item}
            speed={speed}
            textColor={textColor}
            marqueeBgColor={marqueeBgColor}
            marqueeTextColor={marqueeTextColor}
            borderColor={borderColor}
            isFirst={idx === 0}
          />
        ))}
      </nav>
    </div>
  );
};

const MenuItem: React.FC<MenuItemProps> = ({
  link,
  text,
  image,
  speed,
  textColor,
  marqueeBgColor,
  marqueeTextColor,
  borderColor,
  isFirst
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const marqueeInnerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const [repetitions, setRepetitions] = useState(4);
  const navigate = useNavigate();
  const animationDefaults = { duration: 0.6, ease: 'expo.out' };

  const findClosestEdge = (mouseX: number, mouseY: number, width: number, height: number): 'top' | 'bottom' => {
    const topEdgeDist = Math.pow(mouseX - width / 2, 2) + Math.pow(mouseY, 2);
    const bottomEdgeDist = Math.pow(mouseX - width / 2, 2) + Math.pow(mouseY - height, 2);
    return topEdgeDist < bottomEdgeDist ? 'top' : 'bottom';
  };

  useEffect(() => {
    const calculateRepetitions = () => {
      if (!marqueeInnerRef.current) return;
      const marqueeContent = marqueeInnerRef.current.querySelector('.marquee-part') as HTMLElement;
      if (!marqueeContent) return;
      const contentWidth = marqueeContent.offsetWidth;
      const viewportWidth = window.innerWidth;
      const needed = Math.ceil(viewportWidth / (contentWidth || 100)) + 2;
      setRepetitions(Math.max(4, needed));
    };

    calculateRepetitions();
    window.addEventListener('resize', calculateRepetitions);
    return () => window.removeEventListener('resize', calculateRepetitions);
  }, [text, image]);

  useEffect(() => {
    const setupMarquee = () => {
      if (!marqueeInnerRef.current) return;
      const marqueeContent = marqueeInnerRef.current.querySelector('.marquee-part') as HTMLElement;
      if (!marqueeContent) return;
      const contentWidth = marqueeContent.offsetWidth;
      if (contentWidth === 0) return;

      if (animationRef.current) {
        animationRef.current.kill();
      }

      animationRef.current = gsap.to(marqueeInnerRef.current, {
        x: -contentWidth,
        duration: speed,
        ease: 'none',
        repeat: -1
      });
    };

    const timer = setTimeout(setupMarquee, 100);
    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        animationRef.current.kill();
      }
    };
  }, [text, image, repetitions, speed]);

  const handleMouseEnter = (ev: React.MouseEvent<HTMLDivElement>) => {
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const edge = findClosestEdge(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height);
    
    gsap.timeline({ defaults: animationDefaults })
      .set(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .set(marqueeInnerRef.current, { y: edge === 'top' ? '101%' : '-101%' }, 0)
      .to([marqueeRef.current, marqueeInnerRef.current], { y: '0%' }, 0);
  };

  const handleMouseLeave = (ev: React.MouseEvent<HTMLDivElement>) => {
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const edge = findClosestEdge(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height);
    
    gsap.timeline({ defaults: animationDefaults })
      .to(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .to(marqueeInnerRef.current, { y: edge === 'top' ? '101%' : '-101%' }, 0);
  };

  return (
    <div
      className="flex-1 relative overflow-hidden text-center"
      ref={itemRef}
      style={{ borderTop: isFirst ? 'none' : `1px solid ${borderColor}` }}
    >
      <div
        className="flex items-center justify-center h-full relative cursor-pointer uppercase no-underline font-semibold text-[2.5vh] transition-opacity hover:opacity-0"
        onClick={(e) => {
          e.preventDefault();
          navigate(link);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ color: textColor }}
      >
        {text}
      </div>
      <div
        className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none translate-y-[101%]"
        ref={marqueeRef}
        style={{ backgroundColor: marqueeBgColor }}
      >
        <div className="h-full w-fit flex" ref={marqueeInnerRef}>
          {[...Array(repetitions)].map((_, idx) => (
            <div className="marquee-part flex items-center flex-shrink-0" key={idx} style={{ color: marqueeTextColor }}>
              <span className="whitespace-nowrap uppercase font-normal text-[2.5vh] leading-[1] px-[1vw]">{text}</span>
              <div
                className="w-[200px] h-[7vh] my-[2em] mx-[2vw] rounded-[50px] bg-cover bg-center"
                style={{ backgroundImage: `url(${image})` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FlowingMenu;
