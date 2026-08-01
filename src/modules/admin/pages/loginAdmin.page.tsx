import { Button } from '@core/components/button/Button';
import { Input } from '@core/components/control/Input';
import { InputPassword } from '@core/components/control/InputPasssword';
import { generateForm } from '@core/components/form/generateForm';
import { AuthLayout } from '@layouts/auth/AuthLayout';

import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { createEffect } from 'solid-js';
import { EAccountType } from '@/shared/types/auth.type';
import { AdminService } from '@/shared/services/admin/admin.service';
import { useAuth } from '@/shared/contexts/auth/AuthContext';


export function LoginAdminPage() {
  const { navigateToPage } = useRoutes();
  const auth = useAuth()!;

  const { Form, submitting, submitted } = generateForm({
    handleSubmit: async (values) => {
      const res = await AdminService.loginAdmin({
        data: {
          username: values.username,
          password: values.password
        }
      });

      if (res?.token && res?.admin) {
        auth.setAuthData(
          EAccountType.ADMIN,
          res.admin,
          res.token
        );
        return { success: true };
      }

      throw new Error('Login failed');
    },
  });

  createEffect(() => {
    if (auth.getAccountByType(EAccountType.ADMIN)) {
      navigateToPage('adminDashboard.default');
    }
  });

  return (
    <AuthLayout title="Quản trị hệ thống">
      {/* Header Section */}
      <div class="mb-8 text-center animate-fade-in">
        <h1 class="text-2xl font-bold text-gray-900">Admin Portal</h1>
        <p class="text-sm text-gray-500 mt-1">Đăng nhập với tài khoản quản trị</p>
      </div>

      {/* Form Section */}
      <Form class="w-full flex flex-col gap-y-5">
        <Form.Fieldset class="flex flex-col gap-y-4">
          <Form.Field name="username" label="Tên đăng nhập" required>
            <Input
              autoFocus
              placeholder="Nhập username..."
              class="h-11 w-full rounded-lg border-gray-200"
            />
          </Form.Field>

          <Form.Field name="password" label="Mật khẩu" required>
            <InputPassword
              placeholder="••••••••"
              class="h-11 w-full rounded-lg border-gray-200"
            />
          </Form.Field>

          <div class="flex justify-end -mt-1">
            <button
              type="button"
              onClick={() => navigateToPage('adminAuth.forgotPassword')}
              class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Quên mật khẩu?
            </button>
          </div>

          <Form.Error class="text-sm text-red-600 font-medium" />

          {/* Button Area: Căn lề rộng toàn bộ (w-full) để giao diện cân đối */}
          <div class="w-full pt-2">
            <Button
              wide
              main
              class="h-12 w-full text-base font-bold shadow-md transition-all active:scale-[0.98] rounded-lg"
              label="Đăng nhập"
              submit
              loading={submitting()}
              disabled={submitted()}
            />
          </div>
        </Form.Fieldset>
      </Form>

      {/* Footer Section */}
      <div class="mt-10 border-t border-gray-100 pt-6 text-center">
        <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">
          Agri Enterprise System - Admin
        </p>
      </div>
    </AuthLayout>
  );
}