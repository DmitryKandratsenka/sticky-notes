import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { App } from './App';

it('renders the app shell with the welcome notes', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /sticky notes/i })).toBeInTheDocument();
  expect(screen.getByText(/welcome to your desk/i)).toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(3);
});
