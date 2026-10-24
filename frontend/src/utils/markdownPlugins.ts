import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  imagePlugin
} from '@mdxeditor/editor';

// Shared plugin set for rendering markdown descriptions read-only (agenda cards, live presentation)
export const READONLY_PLUGINS = [
  headingsPlugin(),
  listsPlugin(),
  quotePlugin(),
  thematicBreakPlugin(),
  linkPlugin(),
  imagePlugin()
];
