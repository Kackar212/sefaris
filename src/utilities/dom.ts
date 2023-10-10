export class DOM {
  static parse(text: string, mimeType: DOMParserSupportedType) {
    const domParser = new DOMParser();

    if (mimeType.includes('xml')) {
      mimeType = 'application/xml';
    }

    return domParser.parseFromString(text, mimeType);
  }

  static serialize(node: Node) {
    const serializer = new XMLSerializer();

    return serializer.serializeToString(node);
  }

  static isSupportedType(mimeType: string): mimeType is DOMParserSupportedType {
    const supportedMimeTypes = ['application/xhtml+xml', 'application/xml', 'image/svg+xml', 'text/html', 'text/xml'];

    return supportedMimeTypes.includes(mimeType) || mimeType.includes('xml');
  }

  static isNode<T extends Node>(node: unknown): node is T {
    return node instanceof Node;
  }
}
