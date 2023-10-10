import { DOM } from '@sefaris/utilities';

describe('DOM', () => {
  describe('parse', () => {
    it('should parse html or xml string to DOM', () => {
      const htmlDom = DOM.parse('<div><p>Text</p></div>', 'text/html');
      expect(htmlDom.querySelector('p')?.textContent).toBe('Text');

      const xmlDom = DOM.parse('<foo><bar>baz</bar></foo>', 'text/xml');
      expect(xmlDom.querySelector('bar')?.textContent).toBe('baz');
    });
  });

  describe('serialize', () => {
    it('should serialize dom node to xml string', () => {
      const xml = '<foo><bar>baz</bar></foo>';
      const xmlDom = DOM.parse(xml, 'text/xml');
      expect(DOM.serialize(xmlDom)).toBe(xml);
    });
  });

  describe('isSupportedType', () => {
    it('should return true if mimeType is supported by DOMParser', () => {
      expect(DOM.isSupportedType('application/json')).toBe(false);
      expect(DOM.isSupportedType('text/html')).toBe(true);
      expect(DOM.isSupportedType('text/plain')).toBe(false);
      expect(DOM.isSupportedType('application/xhtml+xml')).toBe(true);
    });
  });

  describe('isNode', () => {
    it('should return true if value passed to it is a node', () => {
      expect(DOM.isNode('')).toBe(false);
      expect(DOM.isNode({})).toBe(false);
      expect(DOM.isNode(document.body)).toBe(true);
      expect(DOM.isNode(DOM.parse('<p>foo</p>', 'text/html'))).toBe(true);
    });
  });
});
