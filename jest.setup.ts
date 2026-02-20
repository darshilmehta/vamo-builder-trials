import '@testing-library/jest-dom'
import 'whatwg-fetch'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => {
      const resp = new Response(JSON.stringify(body), init);
      // Next response allows direct body parsing
      (resp as any).json = () => Promise.resolve(body);
      return resp;
    })
  }
}));
