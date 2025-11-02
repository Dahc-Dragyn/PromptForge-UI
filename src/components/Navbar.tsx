'use client';

import { Fragment } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import {
    Bars3Icon,
    BellIcon,
    XMarkIcon,
    HomeIcon,
    ChartPieIcon,
    BeakerIcon,
    CpuChipIcon,
    BookOpenIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
    {
        name: 'Dashboard',
        href: '/dashboard',
        icon: HomeIcon,
    },
    {
        name: 'Workflow Guide',
        href: '/guide',
        icon: BookOpenIcon,
    },
    {
        name: 'Prompt Clinic',
        href: '/analyze',
        icon: ChartPieIcon,
    },
    {
        name: 'Sandbox',
        href: '/sandbox',
        icon: BeakerIcon,
    },
    {
        name: 'Benchmark',
        href: '/benchmark',
        icon: CpuChipIcon,
    },
];

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

export default function Navbar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const handleSignOut = async () => {
        await logout();
        // Router will automatically redirect to /login via PrivateRoute
    };

    // Don't render the navbar on login/signup pages
    if (pathname === '/login' || pathname === '/signup') {
        return null;
    }

    return (
        <Disclosure as="nav" className="bg-gray-800">
            {({ open }) => (
                <>
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 items-center justify-between">
                            <div className="flex items-center">
                                {/* --- FIX: Logo and flex-shrink-0 div REMOVED --- */}
                                <div className="hidden md:block">
                                    {/* --- FIX: Removed ml-10, added smaller margin --- */}
                                    <div className="ml-4 flex items-baseline space-x-4">
                                        {navigation.map((item) => {
                                            const isActive = pathname.startsWith(item.href);
                                            return (
                                                <Link
                                                    key={item.name}
                                                    href={item.href}
                                                    className={classNames(
                                                        isActive
                                                            ? 'bg-gray-900 text-white'
                                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                                                        'rounded-md px-3 py-2 text-sm font-medium'
                                                    )}
                                                    aria-current={
                                                        isActive ? 'page' : undefined
                                                    }
                                                >
                                                    <item.icon
                                                        className={classNames(
                                                            isActive
                                                                ? 'text-indigo-400'
                                                                : 'text-gray-400 group-hover:text-gray-300',
                                                            'mr-2 h-5 w-5 flex-shrink-0 inline-block'
                                                        )}
                                                        aria-hidden="true"
                                                    />
                                                    {item.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* --- FIX: Grouped Profile dropdown and Mobile button --- */}
                            <div className="flex items-center">
                                <div className="hidden md:block">
                                    <div className="ml-4 flex items-center md:ml-6">
                                        {/* Profile dropdown */}
                                        <Menu as="div" className="relative ml-3">
                                            <div>
                                                <Menu.Button className="relative flex max-w-xs items-center rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                                                    <span className="absolute -inset-1.5" />
                                                    <span className="sr-only">
                                                        Open user menu
                                                    </span>
                                                    <img
                                                        className="h-8 w-8 rounded-full"
                                                        src={
                                                            user?.photoURL ||
                                                            `https://avatar.vercel.sh/${
                                                                user?.email || 'default'
                                                            }.svg`
                                                        }
                                                        alt=""
                                                    />
                                                </Menu.Button>
                                            </div>
                                            <Transition
                                                as={Fragment}
                                                enter="transition ease-out duration-100"
                                                enterFrom="transform opacity-0 scale-95"
                                                enterTo="transform opacity-100 scale-100"
                                                leave="transition ease-in duration-75"
                                                leaveFrom="transform opacity-100 scale-100"
                                                leaveTo="transform opacity-0 scale-95"
                                            >
                                                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                    <Menu.Item>
                                                        <div className="block px-4 py-2 text-sm text-gray-700">
                                                            {user?.email}
                                                        </div>
                                                    </Menu.Item>
                                                    <Menu.Item>
                                                        {({ active }) => (
                                                            <a
                                                                onClick={handleSignOut}
                                                                className={classNames(
                                                                    active
                                                                        ? 'bg-gray-100'
                                                                        : '',
                                                                    'block px-4 py-2 text-sm text-gray-700 cursor-pointer'
                                                                )}
                                                            >
                                                                Sign out
                                                            </a>
                                                        )}
                                                    </Menu.Item>
                                                </Menu.Items>
                                            </Transition>
                                        </Menu>
                                    </div>
                                </div>
                                <div className="-mr-2 flex md:hidden">
                                    {/* Mobile menu button */}
                                    <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                                        <span className="absolute -inset-0.5" />
                                        <span className="sr-only">
                                            Open main menu
                                        </span>
                                        {open ? (
                                            <XMarkIcon
                                                className="block h-6 w-6"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <Bars3Icon
                                                className="block h-6 w-6"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </Disclosure.Button>
                                </div>
                            </div>
                            {/* --- End of FIX group --- */}
                        </div>
                    </div>

                    <Disclosure.Panel className="md:hidden">
                        <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
                            {/* --- FIX: Added mobile logo link --- */}
                            <Disclosure.Button
                                as={Link}
                                href="/dashboard"
                                className="group flex items-center rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                            >
                                <img
                                    className="h-8 w-8 mr-3"
                                    src="/globe.svg"
                                    alt="PromptForge"
                                />
                                PromptForge
                            </Disclosure.Button>
                            {navigation.map((item) => {
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <Disclosure.Button
                                        key={item.name}
                                        as={Link}
                                        href={item.href}
                                        className={classNames(
                                            isActive
                                                ? 'bg-gray-900 text-white'
                                                : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                                            'group flex items-center rounded-md px-3 py-2 text-base font-medium'
                                        )}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        <item.icon
                                            className={classNames(
                                                isActive
                                                    ? 'text-indigo-400'
                                                    : 'text-gray-400 group-hover:text-gray-300',
                                                'mr-3 h-6 w-6 flex-shrink-0'
                                            )}
                                            aria-hidden="true"
                                        />
                                        {item.name}
                                    </Disclosure.Button>
                                );
                            })}
                        </div>
                        <div className="border-t border-gray-700 pb-3 pt-4">
                            <div className="flex items-center px-5">
                                <div className="flex-shrink-0">
                                    <img
                                        className="h-10 w-10 rounded-full"
                                        src={
                                            user?.photoURL ||
                                            `https://avatar.vercel.sh/${
                                                user?.email || 'default'
                                            }.svg`
                                        }
                                        alt=""
                                    />
                                </div>
                                <div className="ml-3">
                                    <div className="text-base font-medium leading-none text-white">
                                        {user?.displayName || 'User'}
                                    </div>
                                    <div className="text-sm font-medium leading-none text-gray-400">
                                        {user?.email}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 space-y-1 px-2">
                                <Disclosure.Button
                                    as="a"
                                    onClick={handleSignOut}
                                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white cursor-pointer"
                                >
                                    Sign out
                                </Disclosure.Button>
                            </div>
                        </div>
                    </Disclosure.Panel>
                </>
            )}
        </Disclosure>
    );
}