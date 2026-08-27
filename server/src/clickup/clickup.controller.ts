import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface FetchTitleBody {
  url: string;
}

@Controller('clickup')
export class ClickupController {
  private readonly token: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('CLICKUP_API_TOKEN');
  }

  private extractTaskId(url: string): string | null {
    // Formato antigo: /t/{taskId}
    // Formato novo:   /t/{teamId}/{taskId}
    // O ID real da tarefa é sempre o último segmento após /t/.
    const match = /\/t\/([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)\/?$/.exec(url);
    if (!match) return null;
    const segments = match[1].split('/');
    const last = segments[segments.length - 1];
    // Ignora sufixos de rota interna (ex.: /t/{team}/{task}/TASK, LIST_VIEW)
    if (last === 'TASK' || last === 'LIST_VIEW' || last === 'view') {
      return segments.length > 1 ? segments[segments.length - 2] : null;
    }
    return last;
  }

  @Post('title')
  async fetchTitle(@Body() body: FetchTitleBody) {
    const taskId = body?.url ? this.extractTaskId(body.url) : null;
    if (!taskId) {
      throw new BadRequestException('Link do ClickUp inválido.');
    }

    const apiUrl = `https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}`;
    const res = await fetch(apiUrl, {
      headers: {
        Authorization: this.token ?? '',
      },
    });

    if (res.status === 401 || res.status === 403) {
      throw new BadRequestException(
        'Token do ClickUp não configurado ou sem permissão.',
      );
    }
    if (!res.ok) {
      throw new BadRequestException('Não foi possível buscar a tarefa no ClickUp.');
    }

    const data = (await res.json()) as { name?: string };
    return { title: data.name ?? null };
  }
}
