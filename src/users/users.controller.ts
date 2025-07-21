import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UpdateUserDto, AddBalanceDto, UpdateBalanceDto } from './dtos/users.dto';
import { z } from 'zod';

const AddAffiliateBalanceDto = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  amount: z.number().positive('Amount must be positive'),
});

type AddAffiliateBalanceDto = z.infer<typeof AddAffiliateBalanceDto>;

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Req() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.usersService.getUserById(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/balance')
  async getCurrentUserBalance(@Req() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.usersService.getUserBalance(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('balance')
  async addUserBalance(@Body(new ZodValidationPipe(AddBalanceDto)) body: AddBalanceDto) {
    return this.usersService.addUserBalance(body.userId, body.amount);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('affiliate-balance')
  async addAffiliateBalance(@Body(new ZodValidationPipe(AddAffiliateBalanceDto)) body: AddAffiliateBalanceDto) {
    return this.usersService.addAffiliateBalance(body.userId, body.amount);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('balance')
  async updateUserBalance(@Body(new ZodValidationPipe(UpdateBalanceDto)) body: UpdateBalanceDto) {
    return this.usersService.updateUserBalance(body.userId, body.balance);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('balance')
  async resetUserBalance(@Body() body: { userId: number }) {
    return this.usersService.resetUserBalance(body.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateCurrentUser(@Req() req, @Body(new ZodValidationPipe(UpdateUserDto)) body: UpdateUserDto) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.usersService.updateUser(userId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async getAllUsers(@Req() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.usersService.getAllUsers();
  }
}