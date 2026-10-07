import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { notifications } from '@mantine/notifications';
import { useLogin } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../lib/queryClient';
import { isAuthenticated } from '../../lib/session';
import PasswordInput from '../../components/common/PasswordInput';
import Spinner from '../../components/common/Spinner';
import PixelBlast from '../../components/effects/PixelBlast';

export default function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const loading = loginMutation.isPending;
  const error = loginMutation.isError
    ? getApiErrorMessage(loginMutation.error, 'Login failed')
    : null;

  useEffect(() => {
    if (isAuthenticated()) navigate('/', { replace: true });
  }, [navigate]);

  const onSubmit = (data) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        notifications.show({ message: 'Welcome back!', color: 'green' });
        navigate('/');
      },
    });
  };

  return (
    <div className="login-page min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="login-page__bg" aria-hidden="true">
        <PixelBlast
          variant="circle"
          pixelSize={6}
          color="#8eb8ff"
          patternScale={3}
          patternDensity={1.2}
          pixelSizeJitter={0.5}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.6}
          edgeFade={0.25}
          transparent
        />
      </div>

      <div className="login-page__overlay" aria-hidden="true" />

      <div className="login-page__content w-full max-w-md">
        <div className="bg-transparent border-2 border-white/20 backdrop-blur-[13px] px-6 py-8 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.1)]">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/shield.svg" alt="Insurance MIS" className="w-16 h-16 object-contain" />
            </div>
            <p className="text-white/90 text-lg mt-1">Insurance MIS</p>
          </div>

          <h2 className="text-2xl font-bold text-white mb-6 text-center">Sign In</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">Username</label>
              <input
                type="text"
                className="login-input"
                placeholder="Enter your username"
                autoComplete="username"
                {...register('userName', { required: 'User name is required' })}
              />
              {errors.userName && (
                <p className="text-red-500 text-xs mt-1">{errors.userName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">Password</label>
              <PasswordInput
                className="login-input login-input--with-toggle"
                toggleClassName="text-white hover:text-white focus:ring-white/40"
                placeholder="Enter your password"
                autoComplete="current-password"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
