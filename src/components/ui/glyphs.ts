import {
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  CalendarOff,
  CalendarPlus,
  ChartNoAxesColumn,
  CircleHelp,
  ClipboardList,
  Clock,
  CreditCard,
  Dumbbell,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Repeat,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Target,
  Timer,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
  Video,
} from "lucide-react";

/**
 * Every icon the app uses, named for what it *means* rather than what it
 * depicts.
 *
 * The point of the indirection: "the calendar one" appears on the admin tab,
 * the dashboard heading, the coach schedule and the class row, and those four
 * must be the same icon. Importing `CalendarDays` at each site works right up
 * until someone reaches for `Calendar` at the fifth, and then the product has
 * two calendars. Renaming a concept here changes it everywhere at once.
 *
 * Kept as a flat map rather than nested by page, because several of these are
 * deliberately shared across pages — `classes` is the same idea whether an
 * admin, a coach or a member is looking at it, and that is worth saying in the
 * shape of the file.
 */
export const glyphs = {
  // Navigation and areas
  overview: LayoutDashboard,
  members: Users,
  classes: CalendarDays,
  groups: UsersRound,
  leads: Sparkles,
  pricing: IndianRupee,
  blog: Newspaper,
  faq: CircleHelp,
  admin: Shield,
  coach: Dumbbell,

  // Dashboard and membership
  dashboard: LayoutDashboard,
  membership: BadgeCheck,
  payment: CreditCard,
  signOut: LogOut,
  profile: UserRound,

  // Scheduling
  schedule: CalendarPlus,
  upcoming: CalendarClock,
  nothingScheduled: CalendarOff,
  duration: Timer,
  time: Clock,
  repeating: Repeat,
  live: Video,

  // People
  newMember: UserPlus,
  capacity: SlidersHorizontal,
  goal: Target,

  // Reporting
  stats: ChartNoAxesColumn,
  assessment: ClipboardList,
} as const;

export type GlyphName = keyof typeof glyphs;
