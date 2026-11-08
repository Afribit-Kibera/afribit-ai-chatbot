const repository = 'https://github.com/Afribit-Kibera/afribit-ai-chatbot';
const source = `${repository}/tree/release/open-source`;

export function SoftwareNotice() {
  return <details className="space-privacy">
    <summary>About this software</summary>
    <p>Copyright 2026 Afribit Africa and contributors. Application code: AGPL-3.0-only. No warranty.</p>
    <p><a className="text-link" href={source}>Source code</a>{' · '}
      <a className="text-link" href={`${repository}/blob/release/open-source/LICENSE`}>License</a>{' · '}
      <a className="text-link" href={`${repository}/blob/release/open-source/NOTICE`}>Credits</a></p>
  </details>;
}
