jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('react-native-android-widget', () => ({
  requestWidgetUpdate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/widget/widgetTaskHandler', () => ({
  renderWidgetForName: jest.fn().mockResolvedValue(null),
}));

import { requestWidgetUpdate } from 'react-native-android-widget';
import { refreshAllWidgetsNow, queueWidgetRefresh } from '../src/widget/requestUpdate';

describe('widget refresh orchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('refreshAllWidgetsNow requests updates for both widget names', async () => {
    await refreshAllWidgetsNow();

    expect(requestWidgetUpdate).toHaveBeenCalledTimes(2);
    expect(requestWidgetUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ widgetName: 'BirthdayUpcoming' })
    );
    expect(requestWidgetUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ widgetName: 'BirthdayFavorites' })
    );
  });

  it('queueWidgetRefresh coalesces rapid calls into a single refresh cycle', async () => {
    jest.useFakeTimers();

    queueWidgetRefresh(100);
    queueWidgetRefresh(100);
    queueWidgetRefresh(100);

    expect(requestWidgetUpdate).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();

    expect(requestWidgetUpdate).toHaveBeenCalledTimes(2);
  });
});
