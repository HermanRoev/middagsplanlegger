
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecipesContent from './RecipesContent';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

// Mock data
const mockMeals = [
  { id: '1', name: 'Spaghetti Bolognese', servings: 4, prepTime: 30, ingredients: [{name: 'pasta', amount: 1, unit: 'kg'}], instructions: ['cook pasta'], imageUrl: null, costEstimate: null, nutrition: {}, rating: 0, lastCooked: '', createdBy: {id: '', name: ''} },
  { id: '2', name: 'Chicken Curry', servings: 4, prepTime: 45, ingredients: [], instructions: [], imageUrl: null, costEstimate: null, nutrition: {}, rating: 0, lastCooked: '', createdBy: {id: '', name: ''} },
];

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
  addDoc: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {}, // Mock db object
}));

// Mock Auth Context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-user' } }),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('RecipesContent', () => {
  let onSnapshotCallCount = 0;
  beforeEach(() => {
    vi.clearAllMocks();
    (query as vi.Mock).mockReturnThis();
    (orderBy as vi.Mock).mockReturnThis();
    onSnapshotCallCount = 0;

    // Mock the two onSnapshot calls
    (onSnapshot as vi.Mock).mockImplementation((q, callback) => {
      onSnapshotCallCount++;
      // First call is for meals
      if (onSnapshotCallCount === 1) {
        setTimeout(() => {
          callback({ docs: mockMeals.map(m => ({ id: m.id, data: () => m })) });
        }, 0);
      }
      // Second call is for cupboard
      if (onSnapshotCallCount === 2) {
        setTimeout(() => {
          callback({ docs: [] });
        }, 0);
      }
      return () => {}; // Return a valid unsubscribe function
    });
  });

  it('should render loading state initially', () => {
    (onSnapshot as vi.Mock).mockImplementation(() => { return () => {}}); // Prevent immediate data load
    render(<RecipesContent />);
    expect(screen.getAllByTestId('recipe-card-skeleton').length).toBeGreaterThan(0);
  });

  it('should render recipes after loading', async () => {
    render(<RecipesContent />);
    await waitFor(() => {
      expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
      expect(screen.getByText('Chicken Curry')).toBeInTheDocument();
    });
  });

  it('should filter recipes based on search term', async () => {
    render(<RecipesContent />);
    await waitFor(() => {
      expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search recipes...');
    fireEvent.change(searchInput, { target: { value: 'curry' } });

    await waitFor(() => {
      expect(screen.queryByText('Spaghetti Bolognese')).not.toBeInTheDocument();
      expect(screen.getByText('Chicken Curry')).toBeInTheDocument();
    });
  });
});
