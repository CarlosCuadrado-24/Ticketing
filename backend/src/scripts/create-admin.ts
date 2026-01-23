import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { AdminService } from "../application/services/admin.service";
import { CreateAdminUserDto } from "../presentation/dtos/create-admin-user.dto";
import { UserRole } from "../domain/enums/user-role.enum";

async function createAdminUser() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminService = app.get(AdminService);

  const adminUserDto: CreateAdminUserDto = {
    email: "admin@ticketapp.com",
    password: "Admin123!",
    firstName: "Admin",
    lastName: "User",
    role: UserRole.ADMIN,
  };

  try {
    const adminUser = await adminService.createAdminUser(adminUserDto);
    console.log("✅ Admin user created successfully:");
    const emailValue = typeof adminUser.email === "string"
      ? adminUser.email
      : (adminUser.email && typeof adminUser.email === 'object' && 'value' in adminUser.email
        ? (adminUser.email as any).value
        : String(adminUser.email));
    console.log(`Email: ${emailValue}`);
    console.log(`Name: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`Role: ${adminUser.role}`);
    console.log(`ID: ${adminUser.id}`);
  } catch (error: any) {
    console.error("❌ Error creating admin user:", error?.message || error);
  } finally {
    await app.close();
  }
}

createAdminUser();
