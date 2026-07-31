import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { App } from './App';

it('renders the app shell and hydrates the welcome notes', async () => {
  render(<App />);
  expect(await screen.findByText(/welcome to your desk/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /sticky notes/i })).toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(3);
});
