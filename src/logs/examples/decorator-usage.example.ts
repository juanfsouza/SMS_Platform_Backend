import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { LogAction } from '../decorators/log-action.decorator';
import { LogCategory } from '../dtos/create-log.dto';

@Controller('example')
@UseGuards(JwtAuthGuard)
export class ExampleController {
  
  @Get('profile')
  @LogAction({
    category: LogCategory.PROFILE,
    action: 'Acessou a página de perfil',
    description: 'Acessou a página de perfil do usuário',
    includeUser: true,
    includeRequest: false,
  })
  async getProfile() {
    return { message: 'Profile data' };
  }

  @Post('update-profile')
  @LogAction({
    category: LogCategory.PROFILE,
    action: 'Atualizou perfil',
    description: 'Atualizou informações do perfil',
    includeUser: true,
    includeRequest: true,
  })
  async updateProfile(@Body() updateData: any) {
    return { message: 'Profile updated' };
  }

  @Get('documentation')
  @LogAction({
    category: LogCategory.DOCUMENTATION,
    action: 'Acessou a Página de Documentação',
    description: 'Acessou a Página de Documentação - API Reference',
    includeUser: true,
  })
  async getDocumentation() {
    return { message: 'Documentation data' };
  }

  @Get('my-apis')
  @LogAction({
    category: LogCategory.MY_APIS,
    action: 'Acessou o painel minhas APIs',
    description: 'Acessou o painel minhas APIs',
    includeUser: true,
  })
  async getMyApis() {
    return { message: 'My APIs data' };
  }

  @Post('create-route')
  @LogAction({
    category: LogCategory.ROUTES_CREATED,
    action: 'CRIADOR: ... a Token',
    description: 'Criou uma nova rota/endpoint',
    includeUser: true,
    includeRequest: true,
  })
  async createRoute(@Body() routeData: any) {
    return { message: 'Route created' };
  }
}
