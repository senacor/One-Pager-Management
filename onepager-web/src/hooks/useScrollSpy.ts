import { useEffect, useState, useRef } from 'react';

export const useScrollSpy = (sectionIds: string[]): number => {
    const [activeIndex, setActiveIndex] = useState(0);
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

        if (sections.length === 0) return;

        observer.current = new IntersectionObserver(
            (entries) => {
                const visibleSections = entries
                    .filter(entry => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

                if (visibleSections.length > 0) {
                    const mostVisible = visibleSections[0];
                    const index = sectionIds.findIndex(id => id === mostVisible.target.id);
                    if (index !== -1) {
                        setActiveIndex(index);
                    }
                }
            },
            {
                threshold: [0.1, 0.3, 0.5, 0.7, 0.9],
                rootMargin: '-20% 0px -20% 0px'
            }
        );

        sections.forEach(section => {
            if (section) observer.current?.observe(section);
        });

        return () => {
            observer.current?.disconnect();
        };
    }, [sectionIds]);

    return activeIndex;
};
