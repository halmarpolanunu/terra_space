import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
} from 'remotion';
import {pipelineStats} from './pipeline-data';

const C = {
  bg: '#05070a',
  paper: '#f5f0e6',
  ink: '#111318',
  amber: '#f2a93b',
  amberSoft: 'rgba(242, 169, 59, 0.18)',
  dim: '#9ba4b2',
  line: 'rgba(245, 240, 230, 0.15)',
  green: '#72d99a',
  red: '#ef7777',
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const PhaseLabel: React.FC<{number: string; title: string; left: number; top?: number}> = ({number, title, left, top = 118}) => (
  <div style={{position: 'absolute', left, top, display: 'flex', alignItems: 'center', gap: 18}}>
    <span style={{color: C.amber, fontSize: 15, letterSpacing: 4, fontWeight: 700}}>{number}</span>
    <span style={{width: 48, height: 1, background: C.amber}} />
    <span style={{color: C.paper, fontSize: 21, letterSpacing: 0.5, fontWeight: 600}}>{title}</span>
  </div>
);

const ArticleSheet: React.FC<{frame: number}> = ({frame}) => {
  const cleaned = interpolate(frame, [62, 120], [0, 1], clamp);
  const enter = spring({frame, fps: 30, config: {damping: 180, stiffness: 120}});
  const lines = [92, 76, 86, 62, 91, 70, 82, 55];

  return (
    <div style={{position: 'absolute', left: 510, top: 245, width: 410, height: 535, opacity: enter, translate: `${interpolate(enter, [0, 1], [-80, 0])}px 0px`, rotate: `${interpolate(enter, [0, 1], [-4, -1])}deg`}}>
      <div style={{position: 'absolute', inset: 0, background: C.paper, borderRadius: 4, boxShadow: '0 32px 90px rgba(0,0,0,.45)', padding: '52px 48px', color: C.ink}}>
        <div style={{fontSize: 12, letterSpacing: 3.5, fontWeight: 800, color: '#a56b14'}}>SOURCE ARTICLE</div>
        <div style={{fontSize: 34, lineHeight: 1.05, fontWeight: 800, marginTop: 22}}>A world event,<br />reported in full.</div>
        <div style={{marginTop: 38, display: 'grid', gap: 15}}>
          {lines.map((width, index) => {
            const isNoise = index === 1 || index === 6;
            const peel = isNoise ? cleaned : 0;
            return (
              <div key={width + index} style={{width: `${width}%`, height: index === 3 ? 11 : 8, borderRadius: 8, background: isNoise ? '#c7c1b6' : '#3d4148', opacity: isNoise ? 0.45 * (1 - peel) : 0.76, translate: `${isNoise ? peel * 160 : 0}px ${isNoise ? (index === 1 ? -38 : 42) * peel : 0}px`, rotate: `${isNoise ? peel * 8 : 0}deg`}} />
            );
          })}
        </div>
        <div style={{position: 'absolute', left: 48, right: 48, bottom: 54, height: 34, background: `linear-gradient(90deg, ${C.amberSoft}, rgba(242,169,59,.04))`, borderLeft: `3px solid ${C.amber}`, opacity: cleaned, paddingLeft: 14, display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 800, letterSpacing: 1.8}}>EVIDENCE PRESERVED</div>
      </div>
    </div>
  );
};

const Cleaner: React.FC<{frame: number}> = ({frame}) => {
  const active = interpolate(frame, [58, 84, 126, 145], [0, 1, 1, 0.25], clamp);
  const pulse = interpolate(frame % 24, [0, 12, 24], [0.92, 1.08, 0.92], clamp);
  return (
    <div style={{position: 'absolute', left: 1250, top: 346, width: 260, height: 260, opacity: active}}>
      {[0, 1, 2].map((ring) => <div key={ring} style={{position: 'absolute', inset: 26 + ring * 27, border: `1px solid ${ring === 1 ? C.amber : C.line}`, borderRadius: '50%', scale: ring === 1 ? pulse : 1}} />)}
      <div style={{position: 'absolute', inset: 95, background: C.amber, rotate: '45deg', boxShadow: `0 0 45px ${C.amberSoft}`}} />
      <div style={{position: 'absolute', top: 286, left: -24, width: 310, textAlign: 'center', color: C.dim, fontSize: 15, letterSpacing: 2.6}}>REMOVE NOISE · KEEP FIDELITY</div>
    </div>
  );
};

const MainIssue: React.FC<{frame: number}> = ({frame}) => {
  const appear = spring({frame: Math.max(0, frame - 146), fps: 30, config: {damping: 170, stiffness: 135}});
  const quote = interpolate(frame, [172, 202], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', left: 2290, top: 315, width: 700, height: 390, opacity: appear, scale: interpolate(appear, [0, 1], [0.82, 1])}}>
      <div style={{position: 'absolute', left: 0, top: 90, width: 150, height: 150, borderRadius: '50%', border: `1px solid ${C.amber}`, background: C.amberSoft, boxShadow: `0 0 90px rgba(242,169,59,.12)`}} />
      <div style={{position: 'absolute', left: 68, top: 158, width: 430, height: 2, background: `linear-gradient(90deg, ${C.amber}, ${C.line})`}} />
      <div style={{position: 'absolute', left: 210, top: 35, width: 470}}>
        <div style={{color: C.amber, fontSize: 14, fontWeight: 800, letterSpacing: 3.5}}>ONE GROUNDED MAIN ISSUE</div>
        <div style={{color: C.paper, fontSize: 53, fontWeight: 750, letterSpacing: -1.8, lineHeight: 1.03, marginTop: 20}}>The article’s<br />central concern.</div>
        <div style={{marginTop: 34, height: 54, position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', inset: 0, background: C.amberSoft, borderLeft: `3px solid ${C.amber}`, scale: `${quote} 1`, transformOrigin: 'left center'}} />
          <div style={{position: 'relative', color: C.dim, fontSize: 17, padding: '15px 18px'}}>Exact evidence quote stays attached.</div>
        </div>
      </div>
    </div>
  );
};

const candidates = [
  {x: 0, y: -176, title: 'Event candidate 01', status: 'VALID', color: C.green},
  {x: 150, y: -66, title: 'Event candidate 02', status: 'VALID', color: C.green},
  {x: 150, y: 76, title: 'Event candidate 03', status: 'NEEDS_REVIEW', color: C.amber},
  {x: 0, y: 186, title: 'Event candidate 04', status: 'VALID', color: C.green},
] as const;

const CandidateBurst: React.FC<{frame: number}> = ({frame}) => {
  const base = spring({frame: Math.max(0, frame - 247), fps: 30, config: {damping: 180, stiffness: 140}});
  const retry = interpolate(frame, [314, 342], [0, 1], clamp);

  return (
    <div style={{position: 'absolute', left: 3420, top: 480, width: 920, height: 1}}>
      <div style={{position: 'absolute', left: 0, top: -76, width: 152, height: 152, borderRadius: '50%', background: C.amberSoft, border: `1px solid ${C.amber}`, scale: base}}>
        <div style={{position: 'absolute', inset: 49, background: C.amber, rotate: '45deg'}} />
      </div>
      <svg aria-hidden="true" style={{position: 'absolute', left: 110, top: -260, width: 630, height: 520, overflow: 'visible'}} viewBox="0 0 630 520">
        {candidates.map((candidate, index) => {
          const endY = 260 + candidate.y;
          const draw = interpolate(frame, [252 + index * 6, 284 + index * 6], [0, 1], clamp);
          return <path key={candidate.title} d={`M0 260 C 160 260, 180 ${endY}, 330 ${endY}`} fill="none" stroke={candidate.color} strokeOpacity={0.55} strokeWidth="2" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} />;
        })}
        <path d="M330 336 C520 336 545 430 420 470 C305 505 230 430 300 382" fill="none" stroke={C.red} strokeWidth="2" strokeOpacity={retry * 0.75} pathLength="1" strokeDasharray=".08 .035" strokeDashoffset={1 - retry} />
      </svg>
      <div style={{position: 'absolute', left: 505, top: -250, color: C.red, fontSize: 12, letterSpacing: 2.5, opacity: retry}}>FAILED · MANUAL RETRY</div>
      {candidates.map((candidate, index) => {
        const node = spring({frame: Math.max(0, frame - 274 - index * 6), fps: 30, config: {damping: 180, stiffness: 160}});
        return (
          <div key={candidate.title} style={{position: 'absolute', left: 440 + candidate.x, top: candidate.y - 45, width: 285, height: 90, padding: '17px 20px', borderLeft: `3px solid ${candidate.color}`, background: 'rgba(245,240,230,.065)', opacity: node, translate: `${interpolate(node, [0, 1], [-45, 0])}px 0px`}}>
            <div style={{color: C.paper, fontSize: 18, fontWeight: 650}}>{candidate.title}</div>
            <div style={{color: candidate.color, fontSize: 11, letterSpacing: 2, marginTop: 10}}>{candidate.status}</div>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 16, top: 120, width: 300, color: C.dim, fontSize: 16, lineHeight: 1.4}}>Each candidate keeps its own evidence. Review flags never erase the output.</div>
    </div>
  );
};

const FinalState: React.FC<{frame: number}> = ({frame}) => {
  const reveal = spring({frame: Math.max(0, frame - 366), fps: 30, config: {damping: 190, stiffness: 120}});
  return (
    <div style={{position: 'absolute', left: 4700, top: 230, width: 1000, height: 620, opacity: reveal, translate: `${interpolate(reveal, [0, 1], [80, 0])}px 0px`}}>
      <div style={{color: C.amber, fontSize: 14, letterSpacing: 4, fontWeight: 800}}>VERIFIED CURRENT STATE</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 34, marginTop: 38, color: C.paper, fontWeight: 750}}>
        {[pipelineStats.cleanedArticles, pipelineStats.mainIssues, pipelineStats.phase3Results].map((value, index) => (
          <div key={index} style={{display: 'flex', alignItems: 'center', gap: 34}}>
            <span style={{fontSize: 88, letterSpacing: -4}}>{value}</span>
            {index < 2 ? <span style={{fontSize: 43, color: C.amber, fontWeight: 400}}>→</span> : null}
          </div>
        ))}
      </div>
      <div style={{color: C.dim, fontSize: 15, letterSpacing: 2.5, marginTop: 4}}>CLEANED ARTICLES · MAIN ISSUES · PHASE 3 RESULTS</div>
      <div style={{display: 'flex', gap: 80, marginTop: 68}}>
        <div><div style={{color: C.amber, fontSize: 82, fontWeight: 750}}>{pipelineStats.eventCandidates}</div><div style={{color: C.paper, fontSize: 17, letterSpacing: 1.5}}>EVENT CANDIDATES</div></div>
        <div><div style={{color: C.green, fontSize: 82, fontWeight: 750}}>{pipelineStats.valid}</div><div style={{color: C.paper, fontSize: 17, letterSpacing: 1.5}}>VALID RESULTS</div></div>
        <div><div style={{color: C.amber, fontSize: 82, fontWeight: 750}}>{pipelineStats.needsReview}</div><div style={{color: C.paper, fontSize: 17, letterSpacing: 1.5}}>NEEDS REVIEW</div></div>
      </div>
      <div style={{marginTop: 70, paddingTop: 24, borderTop: `1px solid ${C.line}`, color: C.dim, fontSize: 16, letterSpacing: 1}}>NEXT LAYER → actors · countries · relationships · taxonomy · final Events</div>
    </div>
  );
};

export const LivingDataFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const cameraX = interpolate(frame, [0, 55, 130, 225, 345, 449], [0, -260, -1110, -2100, -3290, -4320], {...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1)});
  const signalX = interpolate(frame, [0, 120, 220, 340, 449], [720, 1450, 2540, 3710, 5070], {...clamp, easing: Easing.bezier(0.45, 0, 0.22, 1)});
  const introOpacity = interpolate(frame, [0, 24, 50, 72], [1, 1, 0.8, 0], clamp);
  const pathDraw = interpolate(frame, [5, 430], [0, 1], clamp);

  return (
    <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', background: C.bg}}>
      <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)', backgroundSize: '76px 76px', backgroundPosition: `${cameraX * 0.08}px 0px`}} />
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 50%, rgba(242,169,59,.08), transparent 28%), linear-gradient(90deg, rgba(5,7,10,0), rgba(5,7,10,.35))'}} />

      <div style={{position: 'absolute', left: 0, top: 0, width: 5900, height: 1080, translate: `${cameraX}px 0px`}}>
        <svg aria-hidden="true" style={{position: 'absolute', inset: 0, width: 5900, height: 1080}} viewBox="0 0 5900 1080">
          <path d="M650 520 C1050 520 1140 478 1390 478 C1820 478 1940 540 2440 540 C2920 540 3100 480 3510 480 C4010 480 4250 510 4900 510" fill="none" stroke={C.line} strokeWidth="2" />
          <path d="M650 520 C1050 520 1140 478 1390 478 C1820 478 1940 540 2440 540 C2920 540 3100 480 3510 480 C4010 480 4250 510 4900 510" fill="none" stroke={C.amber} strokeWidth="3" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - pathDraw} />
        </svg>

        <div style={{position: 'absolute', left: signalX - 9, top: 509, width: 18, height: 18, borderRadius: '50%', background: C.amber, boxShadow: '0 0 18px #f2a93b, 0 0 64px rgba(242,169,59,.55)'}} />

        <div style={{position: 'absolute', left: 116, top: 112, opacity: introOpacity}}>
          <div style={{color: C.amber, fontSize: 15, letterSpacing: 5, fontWeight: 800}}>TERRA SPACE</div>
          <div style={{color: C.paper, fontSize: 64, lineHeight: 0.98, letterSpacing: -2.5, fontWeight: 750, marginTop: 18}}>One article.<br />A traceable chain<br />of events.</div>
        </div>

        <PhaseLabel number="01" title="CLEAN" left={1050} />
        <PhaseLabel number="02" title="DISTILL" left={2170} />
        <PhaseLabel number="03" title="DETECT" left={3340} />
        <ArticleSheet frame={frame} />
        <Cleaner frame={frame} />
        <MainIssue frame={frame} />
        <CandidateBurst frame={frame} />
        <FinalState frame={frame} />
      </div>

      <div style={{position: 'absolute', left: 70, right: 70, bottom: 42, height: 2, background: C.line}}>
        <div style={{height: 2, width: `${interpolate(frame, [0, 449], [0, 100], clamp)}%`, background: C.amber}} />
      </div>
      <div style={{position: 'absolute', right: 70, top: 44, color: C.dim, fontSize: 12, letterSpacing: 3}}>ARTICLE → MAIN ISSUE → EVENT CANDIDATES</div>
    </AbsoluteFill>
  );
};
