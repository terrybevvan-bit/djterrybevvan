import { studioAuthError } from '../../lib/studio-auth';
import { POST as generate } from '../../song-creator/server/generate';

export async function POST(request: Request) {
  return studioAuthError(request) || generate(request);
}
