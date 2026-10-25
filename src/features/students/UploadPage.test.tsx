import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '@/app/App';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { DemoDataProvider } from '@/lib/demo/store';

const csv = `registration_number,student_name,course_code,academic_year,admission_date,enrolment_status,apaar_id
TEST/2026/CSE/901,Upload Test One,CSE,2026-27,2026-07-20,Active,999888777901
TEST/2026/CSE/902,Upload Test Two,CSE,2026-27,2026-07-21,Active,
TEST/2026/XYZ/903,Upload Test Three,XYZ,2026-27,2026-07-22,Active,999888777903
TEST/2026/ECE/904,,ECE,2026-27,2026-07-23,Active,
`;

function renderApp(initialPath: string) {
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

describe('CSV upload workflow', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('validates rows, submits the batch and persists it for review', async () => {
    const user = userEvent.setup();
    renderApp('/login');

    await user.click(await screen.findByRole('button', { name: /Institution Administrator/ }));
    await screen.findByRole('heading', { name: 'Institution dashboard' }, { timeout: 8000 });

    await user.click(screen.getAllByRole('link', { name: 'Bulk upload' })[0]);
    expect(await screen.findByRole('heading', { name: 'Bulk CSV upload' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Continue to upload/ }));
    const file = new File([csv], 'upload-test.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText('Choose CSV file'), file);

    expect(
      await screen.findByRole('heading', { name: /Preview parsed records/ }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/4 row\(s\) ready for validation/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Run validation/ }));
    expect(
      await screen.findByRole('heading', { name: /Deterministic validation results/ }),
    ).toBeInTheDocument();

    // Two rows are blocking (unknown course, missing name), two are valid.
    await user.click(screen.getByRole('button', { name: /Review and correct/ }));
    expect(await screen.findByRole('heading', { name: /Review errors/ })).toBeInTheDocument();
    expect(screen.getAllByText('Correct row').length).toBe(2);

    await user.click(screen.getByRole('button', { name: /Continue to confirm/ }));
    expect(await screen.findByRole('heading', { name: /Confirm submission/ })).toBeInTheDocument();

    await user.click(screen.getByLabelText(/I confirm that the records/));
    await user.click(screen.getByRole('button', { name: /Confirm submission/ }));

    expect(
      await screen.findByRole('heading', { name: /Batch submitted/ }, { timeout: 8000 }),
    ).toBeInTheDocument();
    const body = document.body.textContent ?? '';
    const match = body.match(/SUB-2026-\d{4}/);
    expect(match).not.toBeNull();
    expect(screen.getByText(/valid record\(s\)/)).toBeInTheDocument();

    // The batch is visible in the submissions list.
    await user.click(screen.getAllByRole('link', { name: /^Submissions/ })[0]);
    expect(await screen.findByRole('heading', { name: 'Submissions' })).toBeInTheDocument();
    expect((await screen.findAllByText(match![0])).length).toBeGreaterThan(0);

    // Validation issues were created for the rejected rows instead of dropping them.
    await user.click(screen.getAllByRole('link', { name: /^Validation issues/ })[0]);
    expect(await screen.findByRole('heading', { name: 'Validation issues' })).toBeInTheDocument();
    const issueRows = screen.getAllByRole('row');
    expect(issueRows.length).toBeGreaterThan(1);
  });

  it('restores submitted records after a page reload', async () => {
    const user = userEvent.setup();
    const first = renderApp('/login');

    await user.click(await screen.findByRole('button', { name: /Institution Administrator/ }));
    await screen.findByRole('heading', { name: 'Institution dashboard' }, { timeout: 8000 });
    await user.click(screen.getAllByRole('link', { name: 'Bulk upload' })[0]);
    await screen.findByRole('heading', { name: 'Bulk CSV upload' });
    await user.click(screen.getByRole('button', { name: /Continue to upload/ }));
    await user.upload(
      screen.getByLabelText('Choose CSV file'),
      new File([csv], 'upload-test-2.csv', { type: 'text/csv' }),
    );
    await screen.findByRole('heading', { name: /Preview parsed records/ }, { timeout: 8000 });
    await user.click(screen.getByRole('button', { name: /Run validation/ }));
    await screen.findByRole('heading', { name: /Deterministic validation results/ });
    await user.click(screen.getByRole('button', { name: /Review and correct/ }));
    await screen.findByRole('heading', { name: /Review errors/ });
    await user.click(screen.getByRole('button', { name: /Continue to confirm/ }));
    await user.click(screen.getByLabelText(/I confirm that the records/));
    await user.click(screen.getByRole('button', { name: /Confirm submission/ }));
    await screen.findByRole('heading', { name: /Batch submitted/ }, { timeout: 8000 });

    first.unmount();
    renderApp('/institution/students');
    await waitFor(
      () => expect(screen.getByRole('heading', { name: 'Student records' })).toBeInTheDocument(),
      { timeout: 8000 },
    );
    const search = screen.getByLabelText('Search');
    await user.type(search, 'Upload Test One');
    await waitFor(() => expect(screen.getAllByText('Upload Test One').length).toBeGreaterThan(0));
  });
});
