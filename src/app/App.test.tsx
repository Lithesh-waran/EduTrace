import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { DemoDataProvider } from '@/lib/demo/store';

function renderApp(initialPath = '/login') {
  return render(
    <AuthProvider>
      <DemoDataProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <App />
        </MemoryRouter>
      </DemoDataProvider>
    </AuthProvider>,
  );
}

describe('EduTrace application', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('validates the login form and rejects incorrect demonstration credentials', async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByText('Sign in to EduTrace');
    await user.click(screen.getAllByRole('button', { name: /^Sign in/ })[0]);
    expect(await screen.findByText('Enter your official email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Official email address'), 'wrong@demo.in');
    await user.type(screen.getByLabelText('Password'), 'incorrect');
    await user.click(screen.getAllByRole('button', { name: /^Sign in/ })[0]);

    expect(
      await screen.findByText(/does not match a demonstration account/i, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('signs in as an institution administrator and renders live dashboard data', async () => {
    const user = userEvent.setup();
    renderApp();

    const accountButton = await screen.findByRole('button', { name: /Institution Administrator/ });
    await user.click(accountButton);

    expect(
      await screen.findByRole('heading', { name: 'Institution dashboard' }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('APAAR verified').length).toBeGreaterThan(0);
    expect(screen.getByText('Sanjay Gandhi Institute of Engineering & Technology')).toBeInTheDocument();
    expect(screen.getAllByText(/Batch|SUBM/i).length).toBeGreaterThan(0);
  });

  it('navigates to the student registry, filters records and opens a student', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('button', { name: /Institution Administrator/ }));
    await screen.findByRole('heading', { name: 'Institution dashboard' }, { timeout: 8000 });

    await user.click(screen.getAllByRole('link', { name: 'Student records' })[0]);
    expect(
      await screen.findByRole('heading', { name: 'Student records' }, { timeout: 8000 }),
    ).toBeInTheDocument();

    const rowsBefore = screen.getAllByRole('row').length;
    expect(rowsBefore).toBeGreaterThan(1);

    const search = screen.getByLabelText('Search');
    await user.type(search, 'Aarav');
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1));

    await user.click(screen.getAllByRole('row')[1]);
    expect(await screen.findByText('Enrolment information', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Validation issues/ })).toBeInTheDocument();
  });

  it('gives the AICTE administrator the national overview and admin navigation', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('button', { name: /AICTE Administrator/ }));
    expect(
      await screen.findByRole('heading', { name: 'National overview' }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Total institutions')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Institution registry' }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('link', { name: 'Student records' })).toHaveLength(0);
  });

  it('blocks institution roles from the administrative portal', async () => {
    const user = userEvent.setup();
    const first = renderApp();

    await user.click(await screen.findByRole('button', { name: /Institution Administrator/ }));
    await screen.findByRole('heading', { name: 'Institution dashboard' }, { timeout: 8000 });
    first.unmount();

    renderApp('/admin/dashboard');
    expect(await screen.findByText('Access denied', {}, { timeout: 8000 })).toBeInTheDocument();
  });
});
