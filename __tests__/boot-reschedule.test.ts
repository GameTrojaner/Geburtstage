import * as contacts from '../src/services/contacts';
import * as bootNative from '../src/native/bootReschedule';
import { runPendingBootReschedule } from '../src/tasks/bootReschedule';

jest.mock('../src/services/contacts', () => ({
  checkContactsPermission: jest.fn(),
}));

jest.mock('../src/native/bootReschedule', () => ({
  consumePendingBootReschedule: jest.fn(),
}));

const mockCheckPerm = contacts.checkContactsPermission as jest.MockedFunction<typeof contacts.checkContactsPermission>;
const mockConsumePending =
  bootNative.consumePendingBootReschedule as jest.MockedFunction<typeof bootNative.consumePendingBootReschedule>;

describe('runPendingBootReschedule', () => {
  const loadContacts = jest.fn<Promise<void>, []>();
  const rescheduleNotifications = jest.fn<Promise<void>, []>();

  beforeEach(() => {
    jest.clearAllMocks();
    loadContacts.mockResolvedValue(undefined);
    rescheduleNotifications.mockResolvedValue(undefined);
  });

  it('runs reschedule flow when pending flag exists and permission is granted', async () => {
    mockConsumePending.mockResolvedValue(true);
    mockCheckPerm.mockResolvedValue(true);

    const didRun = await runPendingBootReschedule({
      loadContacts,
      rescheduleNotifications,
    });

    expect(didRun).toBe(true);
    expect(mockConsumePending).toHaveBeenCalledTimes(1);
    expect(mockCheckPerm).toHaveBeenCalledTimes(1);
    expect(loadContacts).toHaveBeenCalledTimes(1);
    expect(rescheduleNotifications).toHaveBeenCalledTimes(1);
  });

  it('skips work when no pending flag exists', async () => {
    mockConsumePending.mockResolvedValue(false);

    const didRun = await runPendingBootReschedule({
      loadContacts,
      rescheduleNotifications,
    });

    expect(didRun).toBe(false);
    expect(mockCheckPerm).not.toHaveBeenCalled();
    expect(loadContacts).not.toHaveBeenCalled();
    expect(rescheduleNotifications).not.toHaveBeenCalled();
  });

  it('skips work when contacts permission is missing', async () => {
    mockConsumePending.mockResolvedValue(true);
    mockCheckPerm.mockResolvedValue(false);

    const didRun = await runPendingBootReschedule({
      loadContacts,
      rescheduleNotifications,
    });

    expect(didRun).toBe(false);
    expect(loadContacts).not.toHaveBeenCalled();
    expect(rescheduleNotifications).not.toHaveBeenCalled();
  });
});
