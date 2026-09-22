import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function currentCleanerCode() {
  const local = new URL('../n8n/phase1-remove-obvious-non-article-text.js', import.meta.url);
  if (fs.existsSync(local)) return fs.readFileSync(local, 'utf8');
  const workflow = JSON.parse(fs.readFileSync(new URL('../../.n8n-backups/p1-process-after-rename.json', import.meta.url), 'utf8'))[0];
  return workflow.nodes.find((node) => node.name === 'Remove Obvious Non-Article Text').parameters.jsCode;
}

function clean(raw) {
  const result = new Function('$input', currentCleanerCode())({
    all: () => [{json: {p1_raw_content_text: raw}}],
  });
  return result[0].json.p1_preclean_content_text;
}

test('removes an opening image caption that substantially repeats the image alt text', () => {
  const raw = [
    '![Railway workers hurry along tracks to repair overhead lines as smoke rises from a drone strike](https://example.test/photo.jpg)',
    '',
    'Railway workers respond to a call to repair overhead lines after they were destroyed by a Russian drone strike in Boryspil.',
    '',
    'Russia has opened a deadly new phase in its war against Ukraine.',
  ].join('\n');

  assert.equal(clean(raw), 'Russia has opened a deadly new phase in its war against Ukraine.');
});

test('preserves an opening paragraph that does not describe the preceding image', () => {
  const raw = [
    '![A government building at sunset](https://example.test/photo.jpg)',
    '',
    'Officials announced a new sanctions package after months of negotiations.',
  ].join('\n');

  assert.equal(clean(raw), 'Officials announced a new sanctions package after months of negotiations.');
});

test('removes a standalone live-updates navigation bullet', () => {
  const raw = [
    'Canadian PM is set to retaliate against tariffs.',
    '',
    '- [US politics live – latest updates](https://example.test/live)',
    '',
    'Mark Carney urged officials to start being serious.',
  ].join('\n');

  assert.equal(clean(raw), 'Canadian PM is set to retaliate against tariffs.\n\nMark Carney urged officials to start being serious.');
});

test('removes the Anadolu subscription footer without removing the article ending', () => {
  const raw = [
    'A framework deal was signed in June.',
    '',
    'Share News',
    '',
    'Anadolu Agency website contains only a portion of the news stories offered to subscribers in the AA News Broadcasting System (HAS), and in summarized form **Please contact us for subscription options**',
    '',
    'Subscription Transactions',
  ].join('\n');

  assert.equal(clean(raw), 'A framework deal was signed in June.');
});

test('removes standalone advertisement labels and an alert signup promo', () => {
  const raw = [
    'Norway seized the ship on Wednesday.',
    '',
    'Advertisement',
    '',
    'Get instant alerts and updates based on your interests. Be the first to know when big stories happen.',
    '',
    'The passengers are being handled by Norwegian authorities.',
  ].join('\n');

  assert.equal(clean(raw), [
    'Norway seized the ship on Wednesday.',
    '',
    'The passengers are being handled by Norwegian authorities.',
  ].join('\n'));
});

test('removes a Reuters image caption followed by its photographer credit', () => {
  const raw = [
    'Key Points',
    '',
    'A Chinese flag flutters on top of the Great Hall of the People in Beijing, China October 18, 2023.',
    '',
    'Edgar Su | Reuters',
    '',
    'China has accused other G20 nations of protectionism.',
  ].join('\n');

  assert.equal(clean(raw), 'Key Points\n\nChina has accused other G20 nations of protectionism.');
});

test('removes a standalone Watch video heading', () => {
  const raw = [
    'Watch: JD Vance "extremely sceptical" over alleged strike on Iranian wedding',
    '',
    'The US military is investigating Iranian claims.',
  ].join('\n');

  assert.equal(clean(raw), 'The US military is investigating Iranian claims.');
});

test('removes an escaped Anadolu sharing and subscription footer', () => {
  const raw = [
    'South Korea has not reached a final decision.',
    '',
    'news\\_share',
    '',
    'news\\_share\\_description **subscription\\_contact**',
  ].join('\n');

  assert.equal(clean(raw), 'South Korea has not reached a final decision.');
});
