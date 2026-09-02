'use strict';
/* ArenaKit — skip painting off-screen code/images. Cannot rewrite Arena's
   React; this only trims compositor work. Toggle off if a block looks blank
   until you scroll to it. */

window.__AEXT_FEATURES__ = window.__AEXT_FEATURES__ || {};

window.__AEXT_FEATURES__['reduce-lag'] = {
  id: 'reduce-lag',
  label: 'Reduce page lag',
  init(ctx) {
    AextDom.addStyle(`
      html.aext-reduce-lag pre{
        content-visibility:auto;
        contain-intrinsic-size:auto 240px;
      }
      html.aext-reduce-lag img, html.aext-reduce-lag video, html.aext-reduce-lag canvas, html.aext-reduce-lag iframe{
        content-visibility:auto;
        contain-intrinsic-size:200px 120px;
      }
      html.aext-reduce-lag .tiptap, html.aext-reduce-lag .ProseMirror, html.aext-reduce-lag [contenteditable="true"]{
        content-visibility:visible!important;
      }
    `, 'arenakit-reduce-lag-css');

    const live = () => typeof AextRuntime === 'undefined' || AextRuntime.isEnabled('reduce-lag');
    const apply = () => {
      try {
        document.documentElement.classList.toggle('aext-reduce-lag', live());
      } catch (e) { /* ignore */ }
    };
    apply();
    this.setEnabled = () => apply();
    ctx.log('ready');
    return true;
  }
};
