import { ContactBirthday } from '../types';

type PhotoSourceContact = Pick<ContactBirthday, 'imageBase64' | 'rawImageUri' | 'imageUri'>;

export function getPhotoModalSource(contact: PhotoSourceContact): { uri: string } | undefined {
  if (contact.imageBase64) {
    return { uri: `data:image/jpeg;base64,${contact.imageBase64}` };
  }
  if (contact.rawImageUri) {
    return { uri: contact.rawImageUri };
  }
  if (contact.imageUri) {
    return { uri: contact.imageUri };
  }
  return undefined;
}
