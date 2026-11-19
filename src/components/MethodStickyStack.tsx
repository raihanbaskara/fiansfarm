import { useState } from 'react';

export type MethodStep = {
  id: string;
  step: string;
  title: string;
  description: string;
  tag: string;
  bgColor: string;
  textColor: string;
  image: string;
};

// 4 Steps tailored for Fian's Farm x EggSync Innovation
const farmSteps: MethodStep[] = [
  {
    id: 'step-01',
    step: '01 / 04 — PANEN',
    title: 'PANEN SEGAR TIAP PAGI.',
    description:
      'Telur ayam kampung murni dipanen setiap fajar di peternakan Fian\'s Farm Pasuruan. Bebas kandang sekat, diberi pakan rempah organik tanpa hormon antibiotik.',
    tag: 'Peternakan Pasuruan',
    bgColor: '#010916',
    textColor: '#ffffff',
    image: '/images/method/step-01.jpg',
  },
  {
    id: 'step-02',
    step: '02 / 04 — HITUNG',
    title: 'PENGHITUNGAN IOT PRESISI.',
    description:
      'Sensor optik inframerah pada smart conveyor EggSync menghitung setiap butir telur secara otomatis tanpa sentuhan tangan, mencegah retak dan 100% bebas human error.',
    tag: 'Smart Conveyor IoT',
    bgColor: '#414447',
    textColor: '#ffffff',
    image: '/images/method/step-02.jpg',
  },
  {
    id: 'step-03',
    step: '03 / 04 — SINKRON',
    title: 'TERHUBUNG REAL-TIME & AI.',
    description:
      'Setiap hitungan telur langsung disinkronkan ke Supabase Cloud dan asisten suara AI Fian\'s Farm. Stok di website terupdate detik itu juga untuk konsumen dan peternak.',
    tag: 'Cloud & AI Voice',
    bgColor: '#0d6adc',
    textColor: '#ffffff',
    image: '/images/method/step-03.jpg',
  },
  {
    id: 'step-04',
    step: '04 / 04 — KONSUMSI',
    title: 'LANGSUNG KE MEJA MAKAN.',
    description:
      'Distribusi Direct-to-Consumer segar dari peternak ke dapur rumah Anda. Menghadirkan asupan protein murni, kuning telur pekat, dan gizi terbaik bagi seluruh keluarga.',
    tag: 'Meja Keluarga',
    bgColor: '#ffffff',
    textColor: '#010916',
    image: '/images/method/step-04.jpg',
  },
];

// Original Framer 4-step framework (from aihighschool.framer.website reference)
const framerOriginalSteps: MethodStep[] = [
  {
    id: 'framer-01',
    step: '01 / 04 — LEARN',
    title: 'LEARN THE IDEA.',
    description:
      'Short, practical lessons with a real teacher. No lecture runs longer than twenty minutes. Understand the farm ecosystem and technological needs.',
    tag: 'Theory & Observation',
    bgColor: '#010916',
    textColor: '#ffffff',
    image: '/images/method/step-01.jpg',
  },
  {
    id: 'framer-02',
    step: '02 / 04 — BUILD',
    title: 'BUILD SOMETHING REAL.',
    description:
      'Every concept turns into a project: a hardware counter, a model, a web dashboard, an AI assistant, or a production-ready solution.',
    tag: 'Hardware & IoT Prototyping',
    bgColor: '#414447',
    textColor: '#ffffff',
    image: '/images/method/step-02.jpg',
  },
  {
    id: 'framer-03',
    step: '03 / 04 — DEFEND',
    title: 'DEFEND IT IN PUBLIC.',
    description:
      'Students present to parents, mentors, academic lecturers, and field partners at the end of every term for rigorous feedback and validation.',
    tag: 'Public Defense & Testing',
    bgColor: '#0d6adc',
    textColor: '#ffffff',
    image: '/images/method/step-03.jpg',
  },
  {
    id: 'framer-04',
    step: '04 / 04 — APPLY',
    title: 'APPLY IT AT HOME.',
    description:
      'Each module ends with a task for the family table. Parents and consumers see the real tangible impact before the final academic report arrives.',
    tag: 'Family Table Impact',
    bgColor: '#ffffff',
    textColor: '#010916',
    image: '/images/method/step-04.jpg',
  },
];

export default function MethodStickyStack() {
  const [activeTab, setActiveTab] = useState<'farm' | 'original'>('farm');
  const steps = activeTab === 'farm' ? farmSteps : framerOriginalSteps;

  return (
    <section id="metode" className="relative isolate py-24 sm:py-32 border-t border-white/[.08]">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-8 lg:px-12">
        {/* Section Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 font-mono text-[11px] uppercase tracking-wider text-[#cbd2b3]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#cbd2b3] animate-pulse" />
              [ 4 Langkah · Alur Inovasi Farm-to-Table ]
            </div>
            <h2 className="mt-3 font-heading text-4xl italic leading-none sm:text-5xl md:text-6xl text-white">
              The Method.
            </h2>
            <p className="mt-4 text-sm font-light leading-relaxed text-white/70">
              Empat langkah terpadu menghubungkan peternakan Fian's Farm, teknologi penghitung pintar EggSync Dewantara UM, hingga tersaji segar di meja keluarga Anda.
            </p>
          </div>

          {/* Toggle View Mode */}
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 p-1 self-start md:self-end">
            <button
              type="button"
              onClick={() => setActiveTab('farm')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'farm'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Alur Fian's Farm
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('original')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'original'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Framer Original
            </button>
          </div>
        </div>

        {/* STICKY STACK CONTAINER */}
        <div className="relative flex flex-col gap-6 pb-20">
          {steps.map((card, index) => {
            // Progressive sticky offset for stacking effect:
            // Card 0: top 84px
            // Card 1: top 116px (32px tab exposed)
            // Card 2: top 148px (32px tab exposed)
            // Card 3: top 180px (32px tab exposed)
            const topOffset = 84 + index * 32;

            return (
              <div
                key={card.id}
                className="sticky transition-all duration-200"
                style={{
                  top: `${topOffset}px`,
                  zIndex: 10 + index,
                }}
              >
                <article
                  className="group relative flex flex-col lg:flex-row items-stretch justify-between gap-6 sm:gap-10 rounded-[24px] p-6 sm:p-10 lg:p-12 shadow-2xl overflow-hidden min-h-[500px] md:min-h-[560px] lg:h-[580px] border border-black/10 dark:border-white/10"
                  style={{
                    backgroundColor: card.bgColor,
                    color: card.textColor,
                  }}
                >
                  {/* Left Column: Typography & Content */}
                  <div className="flex flex-1 flex-col justify-between py-1 z-10">
                    {/* Top Label */}
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs sm:text-sm uppercase tracking-[0.18em] font-semibold opacity-85">
                        {card.step}
                      </span>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider"
                        style={{
                          backgroundColor:
                            card.textColor === '#ffffff'
                              ? 'rgba(255,255,255,0.14)'
                              : 'rgba(0,0,0,0.08)',
                          color: card.textColor,
                        }}
                      >
                        {card.tag}
                      </span>
                    </div>

                    {/* Dominant Large Uppercase Headline */}
                    <div className="my-6 lg:my-0">
                      <h3
                        className="font-bold sm:font-extrabold uppercase tracking-tight text-3xl sm:text-5xl md:text-6xl lg:text-[4.2rem] xl:text-[4.75rem] leading-[0.95]"
                        style={{ color: card.textColor }}
                      >
                        {card.title}
                      </h3>
                    </div>

                    {/* Bottom Description */}
                    <div className="max-w-xl">
                      <p
                        className="text-sm sm:text-base font-normal leading-relaxed"
                        style={{ opacity: 0.85 }}
                      >
                        {card.description}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Hero Image with 20px Rounded Frame */}
                  <div className="relative flex-1 h-[240px] sm:h-[320px] lg:h-full w-full rounded-[20px] overflow-hidden shadow-lg bg-black/10">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div
                      className={`pointer-events-none absolute inset-0 rounded-[20px] ring-1 ring-inset ${
                        card.textColor === '#ffffff'
                          ? 'ring-white/15'
                          : 'ring-black/10'
                      }`}
                    />
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
