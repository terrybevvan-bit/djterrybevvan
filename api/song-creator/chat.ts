import { studioAuthError } from '../../lib/studio-auth';
import { POST as chat } from '../../song-creator/server/chat';

export async function POST(request: Request) {
  return studioAuthError(request) || chat(request);
}
