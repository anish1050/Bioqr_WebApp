import passport from "passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import dotenv from "dotenv";
import { UserQueries } from "./queries.js";

dotenv.config();

// Passport serialization
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
    try {
        const user = await UserQueries.findById(id);
        (done as Function)(null, user ?? null);
    } catch (err) {
        done(err);
    }
});

// Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: `${process.env.SERVER_URL || 'http://localhost:3000'}/auth/google/callback`,
            proxy: true,
            passReqToCallback: true,
        },
        async (req: any, _accessToken: string, _refreshToken: string, profile: GoogleProfile, done: any) => {
            try {
                const existingUser = await UserQueries.findByOAuth("google", profile.id);

                if (existingUser) {
                    existingUser.isNewUser = false;
                    return done(null, existingUser);
                }

                const email = profile.emails![0].value;
                const existingEmailUser = await UserQueries.findByEmail(email);

                if (existingEmailUser) {
                    if (!existingEmailUser.oauth_provider) {
                        await UserQueries.updateOAuth(
                            existingEmailUser.id,
                            "google",
                            profile.id,
                            profile.photos?.[0]?.value || null
                        );
                    }
                    existingEmailUser.isNewUser = false;
                    return done(null, existingEmailUser);
                }

                // CHECK IF REGISTRATION IS ALLOWED
                const isRegistration = (req as any).session.isOAuthRegistration;
                if (!isRegistration) {
                    console.log(`❌ Login attempt for non-existent Google account: ${email}`);
                    return done(null, false, { message: "ACCOUNT_NOT_FOUND" });
                }

                // Create new user
                const newUserId = await UserQueries.createOAuth({
                    first_name: profile.name?.givenName || "",
                    last_name: profile.name?.familyName || "",
                    username: profile.emails![0].value.split("@")[0] + "_google_" + Date.now(),
                    email: profile.emails![0].value,
                    oauth_provider: "google",
                    oauth_id: profile.id,
                    avatar_url: profile.photos?.[0]?.value || null,
                });

                const newUser = await UserQueries.findById(newUserId);
                if (newUser) {
                    (newUser as any).isNewUser = true;
                    console.log(`✅ New Google user created: ${newUser.email}`);
                    return done(null, newUser);
                }
                return done(new Error("Failed to fetch newly created user"));
            } catch (error) {
                return done(error as Error);
            }
        }
    )
);

// GitHub OAuth Strategy
passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            callbackURL: `${process.env.SERVER_URL || 'http://localhost:3000'}/auth/github/callback`,
            proxy: true,
            passReqToCallback: true,
        },
        async (req: any, _accessToken: string, _refreshToken: string, profile: any, done: any) => {
            try {
                const existingUser = await UserQueries.findByOAuth("github", profile.id);

                if (existingUser) {
                    existingUser.isNewUser = false;
                    return done(null, existingUser);
                }

                const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
                const existingEmailUser = await UserQueries.findByEmail(email);

                if (existingEmailUser) {
                    if (!existingEmailUser.oauth_provider) {
                        await UserQueries.updateOAuth(
                            existingEmailUser.id,
                            "github",
                            profile.id,
                            profile.photos?.[0]?.value || null
                        );
                    }
                    existingEmailUser.isNewUser = false;
                    return done(null, existingEmailUser);
                }

                // CHECK IF REGISTRATION IS ALLOWED
                const isRegistration = (req as any).session.isOAuthRegistration;
                if (!isRegistration) {
                    console.log(`❌ Login attempt for non-existent GitHub account: ${profile.username}`);
                    return done(null, false, { message: "ACCOUNT_NOT_FOUND" });
                }

                // Create new user
                const newUserId = await UserQueries.createOAuth({
                    first_name: profile.displayName?.split(" ")[0] || profile.username || "",
                    last_name: profile.displayName?.split(" ").slice(1).join(" ") || "",
                    username: profile.username + "_github_" + Date.now(),
                    email: profile.emails?.[0]?.value || `${profile.username}@github.local`,
                    oauth_provider: "github",
                    oauth_id: profile.id,
                    avatar_url: profile.photos?.[0]?.value || null,
                });

                const newUser = await UserQueries.findById(newUserId);
                if (newUser) {
                    (newUser as any).isNewUser = true;
                    console.log(`✅ New GitHub user created: ${newUser.username}`);
                    return done(null, newUser);
                }
                return done(new Error("Failed to fetch newly created user"));
            } catch (error) {
                return done(error as Error);
            }
        }
    )
);

export default passport;
