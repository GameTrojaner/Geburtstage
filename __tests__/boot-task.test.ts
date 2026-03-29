import * as contacts from '../src/services/contacts';
import * as notifications from '../src/services/notifications';
import { bootTask } from '../src/tasks/bootTask';

jest.mock('../src/services/contacts', () => ({
  checkContactsPermission: jest.fn(),
  getAllContacts: jest.fn(),
}));

jest.mock('../src/services/notifications', () => ({
  scheduleAllNotifications: jest.fn(),
}));

const mockCheckPerm = contacts.checkContactsPermission as jest.MockedFunction<typeof contacts.checkContactsPermission>;
const mockGetAll = contacts.getAllContacts as jest.MockedFunction<typeof contacts.getAllContacts>;
const mockSchedule = notifications.scheduleAllNotifications as jest.MockedFunction<typeof notifications.scheduleAllNotifications>;

const MOCK_CONTACTS = [
  { contactId: 'c1', name: 'Alice', birthday: { day: 5, month: 4 } },
];

describe('bootTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchedule.mockResolvedValue(undefined);
  });

  it('loads contacts and reschedules when permission is granted', async () => {
    mockCheckPerm.mockResolvedValue(true);
    mockGetAll.mockResolvedValue(MOCK_CONTACTS as any);

    await bootTask();

    expect(mockCheckPerm).toHaveBeenCalledTimes(1);
    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledWith(MOCK_CONTACTS);
  });

  it('bails immediately when contacts permission is not granted', async () => {
    mockCheckPerm.mockResolvedValue(false);

    await bootTask();

    expect(mockGetAll).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});
