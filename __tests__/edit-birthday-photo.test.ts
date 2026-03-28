import { getPhotoModalSource } from '../src/utils/photo';

describe('getPhotoModalSource', () => {
  it('prefers imageBase64 over uri fields', () => {
    const source = getPhotoModalSource({
      imageBase64: 'AAAABBBB',
      rawImageUri: 'content://raw',
      imageUri: 'content://thumb',
    });

    expect(source).toEqual({ uri: 'data:image/jpeg;base64,AAAABBBB' });
  });

  it('falls back to rawImageUri when no base64 exists', () => {
    const source = getPhotoModalSource({
      rawImageUri: 'content://raw',
      imageUri: 'content://thumb',
    });

    expect(source).toEqual({ uri: 'content://raw' });
  });

  it('falls back to imageUri when only thumbnail uri exists', () => {
    const source = getPhotoModalSource({
      imageUri: 'content://thumb',
    });

    expect(source).toEqual({ uri: 'content://thumb' });
  });

  it('returns undefined when no source exists', () => {
    const source = getPhotoModalSource({});

    expect(source).toBeUndefined();
  });
});
