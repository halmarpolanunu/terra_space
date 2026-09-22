import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {amber, FadeTitle, SceneShell} from './SceneShell';

export const OpeningScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <SceneShell index="01" label="Overview">
    <div style={{position: 'absolute', top: 252, left: 80, fontSize: 26, letterSpacing: 4, color: amber}}>GLOBAL DEVELOPMENTS</div>
    <FadeTitle top={305} size={104}>Seminggu dalam pantauan.</FadeTitle>
    <div style={{position: 'absolute', top: 605, left: 80, right: 80, fontSize: 42, lineHeight: 1.25, color: '#d7d1c8', opacity: interpolate(frame, [38, 65], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)})}}>Sinyal terkuat bergerak di jalur Hormuz, perang Rusia–Ukraina, keamanan regional, serta tekanan iklim dan energi.</div>
    <div style={{position: 'absolute', top: 1010, left: 80, right: 80, padding: 44, border: '1px solid #ffb23f66', backgroundColor: '#ffb23f12', opacity: interpolate(frame, [64, 95], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}><div style={{fontSize: 102, fontWeight: 800, color: amber}}>22</div><div style={{fontSize: 32, letterSpacing: 1.5}}>ARTIKEL TERPROSES · 10–14 AGUSTUS</div></div>
    <div style={{position: 'absolute', top: 1330, left: 80, right: 80, fontSize: 29, lineHeight: 1.3, color: '#aaa49c', opacity: interpolate(frame, [90, 130], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>Catatan: ini adalah pembacaan sinyal dari artikel yang diproses. Event Phase 3 belum berstatus accepted, sehingga bukan penilaian final.</div>
  </SceneShell>;
};
