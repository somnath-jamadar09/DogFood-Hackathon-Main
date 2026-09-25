/**
 * Lightweight safe Markdown-to-HTML parser for rendering project descriptions offline
 */
export const renderMarkdownToSafeHTML = (md) => {
  if (!md) return '';

  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-gray-100 my-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-100 my-3 border-b border-gray-800 pb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white my-4 border-b border-gray-700 pb-2">$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="text-gray-300 italic">$1</em>');

  // Inline Code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-blue-500 pl-4 py-1 text-gray-400 italic my-2 bg-gray-900/50 rounded-r">$1</blockquote>');

  // Lists
  html = html.replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-gray-300">$1</li>');

  // Paragraphs
  html = html.replace(/\n\n/g, '<br/><br/>');

  return html;
};
