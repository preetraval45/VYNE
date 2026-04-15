import { NextResponse } from 'next/server'

export const runtime = 'edge'

const SCRIPT = `(function() {
  'use strict';
  // VYNE embed widget loader v0.9.0
  // Usage: <script src="https://app.vyne.dev/embed/widget.js" data-vyne-widget="kanban" data-tenant="acme"></script>

  var script = document.currentScript;
  if (!script) return;

  var widget = script.getAttribute('data-vyne-widget') || 'stats';
  var tenant = script.getAttribute('data-tenant') || 'demo-org';
  var theme = script.getAttribute('data-theme') || 'auto';
  var height = script.getAttribute('data-height') || '420';
  var origin = (function() {
    try { return new URL(script.src).origin; } catch (e) { return 'https://app.vyne.dev'; }
  })();

  var target = document.getElementById('vyne-widget') ||
    (function() {
      var d = document.createElement('div');
      d.id = 'vyne-widget';
      script.parentNode.insertBefore(d, script.nextSibling);
      return d;
    })();

  var iframe = document.createElement('iframe');
  iframe.src = origin + '/embed/' + encodeURIComponent(widget) +
    '?tenant=' + encodeURIComponent(tenant) + '&theme=' + encodeURIComponent(theme);
  iframe.title = 'VYNE — ' + widget;
  iframe.loading = 'lazy';
  iframe.allow = 'clipboard-write';
  iframe.style.cssText = [
    'width: 100%',
    'height: ' + height + 'px',
    'border: 1px solid rgba(0,0,0,0.08)',
    'border-radius: 12px',
    'background: #fff',
    'box-shadow: 0 2px 8px rgba(0,0,0,0.04)',
    'display: block'
  ].join(';');

  // Resize messages from the embedded page
  window.addEventListener('message', function(e) {
    if (e.origin !== origin) return;
    if (!e.data || e.data.type !== 'vyne:resize') return;
    if (e.data.height && typeof e.data.height === 'number') {
      iframe.style.height = e.data.height + 'px';
    }
  });

  target.appendChild(iframe);
})();`

export async function GET() {
  return new NextResponse(SCRIPT, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
