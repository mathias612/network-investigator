// Chrome Extension API type definitions
declare namespace chrome {
  namespace devtools {
    namespace panels {
      function create(
        title: string,
        iconPath: string | null,
        pagePath: string,
        callback?: (panel: any) => void,
      ): void;
    }

    namespace network {
      interface Request {
        requestId?: string;
        request: {
          url: string;
          method: string;
          headers: Record<string, string>;
          postData?: {
            text: string;
          };
        };
        response: {
          status: number;
          statusText: string;
          headers: Record<string, string>;
        };
        startedDateTime: string;
        time: number;
        getContent(callback: (content: string, encoding: string) => void): void;
      }

      const onRequestFinished: {
        addListener(callback: (request: Request) => void): void;
        removeListener(callback: (request: Request) => void): void;
      };
    }
  }

  namespace runtime {
    function sendMessage(message: any): Promise<any>;
    const onMessage: {
      addListener(
        callback: (
          message: any,
          sender: any,
          sendResponse: (response: any) => void,
        ) => void,
      ): void;
      removeListener(
        callback: (
          message: any,
          sender: any,
          sendResponse: (response: any) => void,
        ) => void,
      ): void;
    };
  }

  namespace webRequest {
    interface WebRequestDetails {
      url: string;
      method: string;
      statusCode: number;
      requestId: string;
      timeStamp: number;
      type: string;
      tabId: number;
    }
    const onCompleted: {
      addListener(
        callback: (details: WebRequestDetails) => void,
        filter: { urls: string[] },
        extraInfoSpec?: string[],
      ): void;
    };
  }
}
