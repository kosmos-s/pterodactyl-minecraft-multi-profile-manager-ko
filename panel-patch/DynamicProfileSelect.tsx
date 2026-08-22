import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ServerEggVariable } from '@/api/server/types';
import loadDirectory from '@/api/server/files/loadDirectory';
import Input from '@/components/elements/Input';
import Select from '@/components/elements/Select';
import { ServerContext } from '@/state/server';

interface Props {
    variable: ServerEggVariable;
    disabled: boolean;
    onChange: (value: string) => void;
}

const VALID_PROFILE_NAME = /^[A-Za-z0-9._-]+$/;

const DynamicProfileSelect = ({ variable, disabled, onChange }: Props) => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const [profiles, setProfiles] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const currentProfile = variable.serverValue ?? variable.defaultValue ?? '';

    const refreshProfiles = useCallback(() => {
        setLoading(true);
        setFailed(false);

        loadDirectory(uuid, '/servers')
            .then((items) => {
                const folders = items
                    .filter((item) => !item.isFile && !item.isSymlink)
                    .map((item) => item.name)
                    .filter((name) => VALID_PROFILE_NAME.test(name))
                    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                setProfiles(Array.from(new Set(folders)));
            })
            .catch((error) => {
                console.error('[Multi-Profile] Failed to load /servers for SERVER_PROFILE dropdown.', error);
                setFailed(true);
            })
            .then(() => setLoading(false));
    }, [uuid]);

    useEffect(() => {
        refreshProfiles();
    }, [refreshProfiles]);

    const currentProfileMissing = useMemo(
        () => currentProfile.length > 0 && !profiles.includes(currentProfile),
        [currentProfile, profiles]
    );

    // If the current user cannot list files (for example, a sub-user without file.read),
    // keep the original text-input behaviour rather than locking them out of Startup.
    if (failed) {
        return (
            <>
                <Input
                    onKeyUp={(e) => !disabled && onChange(e.currentTarget.value)}
                    readOnly={disabled}
                    name={variable.envVariable}
                    defaultValue={currentProfile}
                    placeholder={variable.defaultValue}
                />
                <p className='mt-1 text-xs text-yellow-300'>
                    /servers 폴더를 읽지 못해 수동 입력 모드로 표시 중입니다. 파일 읽기 권한을 확인하세요.
                </p>
            </>
        );
    }

    if (loading && profiles.length === 0) {
        return (
            <>
                <Select disabled name={variable.envVariable} defaultValue={currentProfile || ''}>
                    <option value={currentProfile || ''}>
                        {currentProfile ? `${currentProfile} · 프로필 목록 불러오는 중...` : '프로필 목록 불러오는 중...'}
                    </option>
                </Select>
                <p className='mt-1 text-xs text-neutral-300'>/servers 폴더에서 프로필을 검색하고 있습니다.</p>
            </>
        );
    }

    const selectKey = `${currentProfile}::${profiles.join('|')}`;

    return (
        <>
            <Select
                key={selectKey}
                onFocus={refreshProfiles}
                onChange={(e) => onChange(e.target.value)}
                name={variable.envVariable}
                defaultValue={currentProfile || ''}
                disabled={disabled || profiles.length === 0}
            >
                {!currentProfile && (
                    <option value='' disabled>
                        프로필을 선택하세요
                    </option>
                )}

                {currentProfileMissing && (
                    <option value={currentProfile} disabled>
                        {currentProfile} (폴더 없음)
                    </option>
                )}

                {profiles.map((profile) => (
                    <option key={profile} value={profile}>
                        {profile}
                    </option>
                ))}

                {profiles.length === 0 && (
                    <option value='' disabled>
                        /servers 아래에 프로필 폴더가 없습니다
                    </option>
                )}
            </Select>

            <p className='mt-1 text-xs text-neutral-300'>
                /servers 아래의 폴더를 자동 감지합니다. 드롭다운을 클릭하면 목록을 다시 확인합니다.
                {loading ? ' 새로고침 중...' : ''}
            </p>
        </>
    );
};

export default DynamicProfileSelect;
